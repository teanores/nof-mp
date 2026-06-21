import crypto from "node:crypto";

import { Pool, type PoolClient, type QueryResultRow } from "pg";

import { platformDatabaseUrl } from "@/lib/server/platform-database-config";
import { hashPlatformPassword, platformPasswordPolicyErrors, type PlatformPasswordPolicyError } from "@/lib/server/platform-password";

const registrationCodeTtlMs = 15 * 60 * 1000;
const maxConfirmationAttempts = 5;

interface ExistingUserRow extends QueryResultRow {
  id: string;
}

interface PendingRegistrationRow extends QueryResultRow {
  attempts: number;
  code_hash: string;
  email: string;
  expires_at: Date | string;
  id: string;
  password_hash: string;
  username: string;
}

export type RegistrationRequestResult =
  | { ok: true; code: string; email: string; reason: "code_created" }
  | { errors?: PlatformPasswordPolicyError[]; ok: false; reason: "conflict" | "password_policy" };

export type RegistrationConfirmResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "conflict" | "invalid_or_expired_code" };

export function normalizeRegistrationEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeRegistrationUsername(username: string): string {
  return username.trim();
}

function hashRegistrationCode(email: string, code: string): string {
  const secret = process.env.SECRET_KEY ?? process.env.NOF_AUTH_SECRET_KEY ?? "nof-mp-registration-dev-secret";
  return crypto.createHmac("sha256", secret).update(`${normalizeRegistrationEmail(email)}:${code}`, "utf8").digest("hex");
}

function generateRegistrationCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export class PlatformRegistrationRepository {
  private readonly codeFactory: () => string;
  private readonly now: () => Date;
  private readonly pool: Pool;

  constructor(
    pool = new Pool({ connectionString: platformDatabaseUrl("Platform registration"), max: 3 }),
    options: { codeFactory?: () => string; now?: () => Date } = {},
  ) {
    this.pool = pool;
    this.codeFactory = options.codeFactory ?? generateRegistrationCode;
    this.now = options.now ?? (() => new Date());
  }

  async requestRegistration(input: { email: string; password: string; username: string }): Promise<RegistrationRequestResult> {
    await this.ensureSchema();

    const email = normalizeRegistrationEmail(input.email);
    const username = normalizeRegistrationUsername(input.username);
    const errors = platformPasswordPolicyErrors(input.password, { email, username });
    if (errors.length > 0) {
      return { errors, ok: false, reason: "password_policy" };
    }

    if (await this.userExists(email, username)) {
      return { ok: false, reason: "conflict" };
    }

    const code = this.codeFactory();
    const expiresAt = new Date(this.now().getTime() + registrationCodeTtlMs);

    await this.pool.query(
      `UPDATE nof_platform.registration_codes
       SET used_at = $2
       WHERE lower(email) = $1
         AND used_at IS NULL`,
      [email, this.now()],
    );
    await this.pool.query(
      `INSERT INTO nof_platform.registration_codes (email, username, password_hash, code_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [email, username, hashPlatformPassword(input.password), hashRegistrationCode(email, code), expiresAt],
    );

    return { ok: true, code, email, reason: "code_created" };
  }

  async confirmRegistration(input: { code: string; email: string }): Promise<RegistrationConfirmResult> {
    await this.ensureSchema();

    const email = normalizeRegistrationEmail(input.email);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const pendingResult = await client.query<PendingRegistrationRow>(
        `SELECT id, email, username, password_hash, code_hash, expires_at, attempts
         FROM nof_platform.registration_codes
         WHERE lower(email) = $1
           AND used_at IS NULL
           AND expires_at > $2
         ORDER BY created_at DESC
         LIMIT 1
         FOR UPDATE`,
        [email, this.now()],
      );
      const pending = pendingResult.rows[0];
      if (!pending || pending.attempts >= maxConfirmationAttempts) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "invalid_or_expired_code" };
      }

      if (pending.code_hash !== hashRegistrationCode(email, input.code.trim())) {
        await client.query(
          `UPDATE nof_platform.registration_codes
           SET attempts = attempts + 1
           WHERE id = $1::uuid`,
          [pending.id],
        );
        await client.query("COMMIT");
        return { ok: false, reason: "invalid_or_expired_code" };
      }

      if (await this.userExists(pending.email, pending.username, client)) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "conflict" };
      }

      const userId = crypto.randomUUID();
      await client.query(
        `INSERT INTO dragon_forge."user"
         (id, username, email, password_hash, experience, role_id, is_bot_blocked, user_created_at, registration_source)
         VALUES ($1::uuid, $2, $3, $4, 0, 3, false, $5, $6)`,
        [userId, pending.username, pending.email, pending.password_hash, this.now(), "nof-mp-email"],
      );
      await client.query(
        `UPDATE nof_platform.registration_codes
         SET used_at = $2
         WHERE id = $1::uuid`,
        [pending.id, this.now()],
      );

      await client.query("COMMIT");
      return { ok: true, userId };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private async ensureSchema(): Promise<void> {
    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS nof_platform`);
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS nof_platform.registration_codes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text NOT NULL,
        username text NOT NULL,
        password_hash text NOT NULL,
        code_hash text NOT NULL,
        attempts integer NOT NULL DEFAULT 0,
        expires_at timestamptz NOT NULL,
        used_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
    );
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS registration_codes_email_unused_idx
       ON nof_platform.registration_codes (lower(email), created_at DESC)
       WHERE used_at IS NULL`,
    );
  }

  private async userExists(email: string, username: string, client: Pick<PoolClient, "query"> = this.pool): Promise<boolean> {
    const result = await client.query<ExistingUserRow>(
      `SELECT id
       FROM dragon_forge."user"
       WHERE lower(email) = $1 OR lower(username) = lower($2)
       LIMIT 1`,
      [normalizeRegistrationEmail(email), normalizeRegistrationUsername(username)],
    );
    return Boolean(result.rows[0]);
  }
}

let repository: PlatformRegistrationRepository | undefined;

export function getPlatformRegistrationRepository(): PlatformRegistrationRepository {
  repository ??= new PlatformRegistrationRepository();
  return repository;
}
