import crypto from "node:crypto";

import { Pool, type QueryResultRow } from "pg";

import { isResettableEmail, normalizePlatformEmail } from "@/lib/server/email-address-policy";
import { platformDatabaseUrl } from "@/lib/server/platform-database-config";
import { hashPlatformPassword, platformPasswordPolicyErrors, type PlatformPasswordPolicyError } from "@/lib/server/platform-password";

const resetTokenTtlMs = 60 * 60 * 1000;
const resetTokenBytes = 32;

interface PasswordResetUserRow extends QueryResultRow {
  email: string | null;
  id: string;
  username: string;
}

interface PasswordResetTokenRow extends QueryResultRow {
  email: string | null;
  expires_at: Date | string;
  id: string;
  used_at: Date | string | null;
  user_id: string;
  username: string;
}

export type PasswordResetRequestResult =
  | { ok: true; reason: "missing_or_unresettable" }
  | { ok: true; expiresAt: Date; reason: "token_created"; resetToken: string; userId: string };

export type PasswordResetConfirmResult =
  | { ok: true }
  | { errors?: PlatformPasswordPolicyError[]; ok: false; reason: "invalid_or_expired_token" | "password_policy" };

export type PasswordResetTokenVerificationResult =
  | { ok: true }
  | { ok: false; reason: "invalid_or_expired_token" };

export function normalizePasswordResetEmail(email: string): string {
  return normalizePlatformEmail(email);
}

export function hashPasswordResetToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export class PlatformPasswordResetRepository {
  private readonly pool: Pool;
  private readonly now: () => Date;
  private readonly tokenFactory: () => string;

  constructor(
    pool = new Pool({ connectionString: platformDatabaseUrl("Platform password reset"), max: 3 }),
    options: { now?: () => Date; tokenFactory?: () => string } = {},
  ) {
    this.pool = pool;
    this.now = options.now ?? (() => new Date());
    this.tokenFactory = options.tokenFactory ?? (() => crypto.randomBytes(resetTokenBytes).toString("base64url"));
  }

  async requestReset(input: { email: string }): Promise<PasswordResetRequestResult> {
    await this.ensureSchema();

    const email = normalizePasswordResetEmail(input.email);
    if (!isResettableEmail(email)) {
      return { ok: true, reason: "missing_or_unresettable" };
    }

    const userResult = await this.pool.query<PasswordResetUserRow>(
      `SELECT id, username, email
       FROM dragon_forge."user"
       WHERE lower(email) = $1
       LIMIT 1`,
      [email],
    );

    const user = userResult.rows[0];
    if (!user?.email || !isResettableEmail(user.email.toLowerCase())) {
      return { ok: true, reason: "missing_or_unresettable" };
    }

    await this.pool.query(
      `UPDATE nof_platform.password_reset_tokens
       SET used_at = $2
       WHERE user_id = $1::uuid
         AND used_at IS NULL`,
      [user.id, this.now()],
    );

    const resetToken = this.tokenFactory();
    const expiresAt = new Date(this.now().getTime() + resetTokenTtlMs);
    await this.pool.query(
      `INSERT INTO nof_platform.password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1::uuid, $2, $3)`,
      [user.id, hashPasswordResetToken(resetToken), expiresAt],
    );

    return { ok: true, expiresAt, reason: "token_created", resetToken, userId: user.id };
  }

  async confirmReset(input: { newPassword: string; token: string }): Promise<PasswordResetConfirmResult> {
    await this.ensureSchema();

    const tokenHash = hashPasswordResetToken(input.token);
    const tokenResult = await this.pool.query<PasswordResetTokenRow>(
      `SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, u.username, u.email
       FROM nof_platform.password_reset_tokens prt
       JOIN dragon_forge."user" u ON u.id = prt.user_id
       WHERE prt.token_hash = $1
         AND prt.used_at IS NULL
         AND prt.expires_at > $2
       LIMIT 1`,
      [tokenHash, this.now()],
    );

    const token = tokenResult.rows[0];
    if (!token) {
      return { ok: false, reason: "invalid_or_expired_token" };
    }

    const errors = platformPasswordPolicyErrors(input.newPassword, { email: token.email, username: token.username });
    if (errors.length > 0) {
      return { errors, ok: false, reason: "password_policy" };
    }

    const usedAt = this.now();
    const updateResult = await this.pool.query(
      `UPDATE nof_platform.password_reset_tokens
       SET used_at = $2
       WHERE id = $1::uuid
         AND used_at IS NULL
         AND expires_at > $3`,
      [token.id, usedAt, usedAt],
    );

    if ((updateResult.rowCount ?? 0) !== 1) {
      return { ok: false, reason: "invalid_or_expired_token" };
    }

    await this.pool.query(
      `UPDATE dragon_forge."user"
       SET password_hash = $1
       WHERE id = $2::uuid`,
      [hashPlatformPassword(input.newPassword), token.user_id],
    );

    return { ok: true };
  }

  async verifyResetToken(input: { token: string }): Promise<PasswordResetTokenVerificationResult> {
    await this.ensureSchema();

    const tokenHash = hashPasswordResetToken(input.token);
    const tokenResult = await this.pool.query<{ id: string }>(
      `SELECT id
       FROM nof_platform.password_reset_tokens
       WHERE token_hash = $1
         AND used_at IS NULL
         AND expires_at > $2
       LIMIT 1`,
      [tokenHash, this.now()],
    );

    return tokenResult.rows[0] ? { ok: true } : { ok: false, reason: "invalid_or_expired_token" };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private async ensureSchema(): Promise<void> {
    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS nof_platform`);
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS nof_platform.password_reset_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        token_hash text NOT NULL UNIQUE,
        expires_at timestamptz NOT NULL,
        used_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
    );
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS password_reset_tokens_user_unused_idx
       ON nof_platform.password_reset_tokens (user_id, expires_at DESC)
       WHERE used_at IS NULL`,
    );
  }
}

let repository: PlatformPasswordResetRepository | undefined;

export function getPlatformPasswordResetRepository(): PlatformPasswordResetRepository {
  repository ??= new PlatformPasswordResetRepository();
  return repository;
}
