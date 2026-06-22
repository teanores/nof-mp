import crypto from "node:crypto";

import { Pool, type QueryResultRow } from "pg";

import { isResettableEmail, isTelegramPlaceholderEmail, normalizePlatformEmail } from "@/lib/server/email-address-policy";
import { getPasswordPolicyStateRepository } from "@/lib/server/password-policy-state-repository";
import { platformDatabaseUrl } from "@/lib/server/platform-database-config";
import { hashPlatformPassword, platformPasswordPolicyErrors, type PlatformPasswordPolicyError } from "@/lib/server/platform-password";

const emailLinkTokenTtlMs = 60 * 60 * 1000;
const emailLinkTokenBytes = 32;

interface EmailLinkUserRow extends QueryResultRow {
  email: string | null;
  id: string;
  telegram_id: number | string | null;
  telegram_username: string | null;
  username: string;
}

interface EmailLinkTokenRow extends QueryResultRow {
  email: string | null;
  expires_at: Date | string;
  id: string;
  telegram_id: number | string | null;
  used_at: Date | string | null;
  user_id: string;
  username: string;
}

interface ExistingEmailRow extends QueryResultRow {
  id: string;
}

export type EmailLinkIssueResult =
  | { ok: true; expiresAt: Date; reason: "token_created"; token: string; userId: string }
  | { ok: false; reason: "missing_user" | "missing_telegram" | "not_telegram_placeholder" };

export type EmailLinkConfirmResult =
  | { ok: true; userId: string }
  | { errors?: PlatformPasswordPolicyError[]; ok: false; reason: "conflict" | "invalid_email" | "invalid_or_expired_token" | "password_policy" };

export function hashEmailLinkToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export class PlatformEmailLinkRepository {
  private readonly now: () => Date;
  private readonly pool: Pool;
  private readonly tokenFactory: () => string;

  constructor(
    pool = new Pool({ connectionString: platformDatabaseUrl("Platform email link"), max: 3 }),
    options: { now?: () => Date; tokenFactory?: () => string } = {},
  ) {
    this.pool = pool;
    this.now = options.now ?? (() => new Date());
    this.tokenFactory = options.tokenFactory ?? (() => crypto.randomBytes(emailLinkTokenBytes).toString("base64url"));
  }

  async issueLink(input: { actorUserId?: string; userId: string }): Promise<EmailLinkIssueResult> {
    await this.ensureSchema();

    const userResult = await this.pool.query<EmailLinkUserRow>(
      `SELECT id, username, email, telegram_id, telegram_username
       FROM dragon_forge."user"
       WHERE id = $1::uuid
       LIMIT 1`,
      [input.userId],
    );
    const user = userResult.rows[0];
    if (!user) {
      return { ok: false, reason: "missing_user" };
    }
    if (!user.telegram_id) {
      return { ok: false, reason: "missing_telegram" };
    }
    if (!user.email || !isTelegramPlaceholderEmail(user.email)) {
      return { ok: false, reason: "not_telegram_placeholder" };
    }

    await this.pool.query(
      `UPDATE nof_platform.email_link_tokens
       SET used_at = $2
       WHERE user_id = $1::uuid
         AND used_at IS NULL`,
      [user.id, this.now()],
    );

    const token = this.tokenFactory();
    const expiresAt = new Date(this.now().getTime() + emailLinkTokenTtlMs);
    await this.pool.query(
      `INSERT INTO nof_platform.email_link_tokens (user_id, token_hash, created_by, expires_at)
       VALUES ($1::uuid, $2, $3, $4)`,
      [user.id, hashEmailLinkToken(token), input.actorUserId ?? null, expiresAt],
    );

    return { expiresAt, ok: true, reason: "token_created", token, userId: user.id };
  }

  async confirmLink(input: { email: string; newPassword: string; token: string }): Promise<EmailLinkConfirmResult> {
    await this.ensureSchema();

    const email = normalizePlatformEmail(input.email);
    if (!isResettableEmail(email)) {
      return { ok: false, reason: "invalid_email" };
    }

    const tokenHash = hashEmailLinkToken(input.token);
    const tokenResult = await this.pool.query<EmailLinkTokenRow>(
      `SELECT elt.id, elt.user_id, elt.expires_at, elt.used_at, u.username, u.email, u.telegram_id
       FROM nof_platform.email_link_tokens elt
       JOIN dragon_forge."user" u ON u.id = elt.user_id
       WHERE elt.token_hash = $1
         AND elt.used_at IS NULL
         AND elt.expires_at > $2
       LIMIT 1`,
      [tokenHash, this.now()],
    );
    const token = tokenResult.rows[0];
    if (!token?.email || !isTelegramPlaceholderEmail(token.email) || !token.telegram_id) {
      return { ok: false, reason: "invalid_or_expired_token" };
    }

    const existingResult = await this.pool.query<ExistingEmailRow>(
      `SELECT id
       FROM dragon_forge."user"
       WHERE lower(email) = $1
         AND id <> $2::uuid
       LIMIT 1`,
      [email, token.user_id],
    );
    if (existingResult.rows[0]) {
      return { ok: false, reason: "conflict" };
    }

    const errors = platformPasswordPolicyErrors(input.newPassword, { email, username: token.username });
    if (errors.length > 0) {
      return { errors, ok: false, reason: "password_policy" };
    }

    const usedAt = this.now();
    const updateToken = await this.pool.query(
      `UPDATE nof_platform.email_link_tokens
       SET used_at = $2
       WHERE id = $1::uuid
         AND used_at IS NULL
         AND expires_at > $3`,
      [token.id, usedAt, usedAt],
    );
    if ((updateToken.rowCount ?? 0) !== 1) {
      return { ok: false, reason: "invalid_or_expired_token" };
    }

    await this.pool.query(
      `UPDATE dragon_forge."user"
       SET email = $1,
           password_hash = $2,
           registration_source = COALESCE(registration_source, 'telegram-email-link')
       WHERE id = $3::uuid`,
      [email, hashPlatformPassword(input.newPassword), token.user_id],
    );
    await getPasswordPolicyStateRepository().clearRotationRequirement(token.user_id);

    return { ok: true, userId: token.user_id };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private async ensureSchema(): Promise<void> {
    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS nof_platform`);
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS nof_platform.email_link_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        token_hash text NOT NULL UNIQUE,
        created_by text,
        expires_at timestamptz NOT NULL,
        used_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
    );
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS email_link_tokens_user_unused_idx
       ON nof_platform.email_link_tokens (user_id, expires_at DESC)
       WHERE used_at IS NULL`,
    );
  }
}

let repository: PlatformEmailLinkRepository | undefined;

export function getPlatformEmailLinkRepository(): PlatformEmailLinkRepository {
  repository ??= new PlatformEmailLinkRepository();
  return repository;
}
