import crypto from "node:crypto";

import { Pool, type QueryResultRow } from "pg";

import { isResettableEmail, isTelegramPlaceholderEmail, normalizePlatformEmail } from "@/lib/server/email-address-policy";
import { getCanonicalIdentityRepository, type CanonicalIdentityRepository } from "@/lib/server/canonical-identity-repository";
import { getPasswordPolicyStateRepository } from "@/lib/server/password-policy-state-repository";
import { platformDatabaseUrl } from "@/lib/server/platform-database-config";
import { hashPlatformPassword, platformPasswordPolicyErrors, type PlatformPasswordPolicyError } from "@/lib/server/platform-password";

const emailLinkTokenTtlMs = 60 * 60 * 1000;
const emailLinkTokenBytes = 32;
const telegramLinkTokenTtlMs = 15 * 60 * 1000;

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
  telegram_username: string | null;
  used_at: Date | string | null;
  user_id: string;
  username: string;
}

interface ExistingEmailRow extends QueryResultRow {
  id: string;
}

export interface SignedEmailLinkTokenPayload {
  expiresAt: Date;
  jti: string;
  userId: string;
}

export type EmailLinkIssueResult =
  | { ok: true; expiresAt: Date; reason: "token_created"; token: string; userId: string }
  | { ok: false; reason: "missing_user" | "missing_telegram" | "not_telegram_placeholder" };

export type TelegramLinkIssueResult =
  | { ok: true; expiresAt: Date; reason: "token_created"; registerUrl: string; token: string; userId: string }
  | { ok: false; reason: "invalid_telegram_id" | "not_telegram_placeholder" };

export type EmailLinkConfirmResult =
  | { ok: true; userId: string }
  | { errors?: PlatformPasswordPolicyError[]; ok: false; reason: "conflict" | "invalid_email" | "invalid_or_expired_token" | "password_policy" };

export type EmailLinkStateResult =
  | {
      ok: true;
      state: {
        expiresAt: Date;
        hasEmail: boolean;
        status: "active" | "expired" | "used";
        telegram: { id: number; username?: string };
        userId: string;
      };
    }
  | { ok: false; reason: "invalid_or_expired_token" };

export function hashEmailLinkToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function configuredEmailLinkSecret(explicitSecret?: string): string {
  return explicitSecret ?? process.env.NOF_MP_TG_LINK_TOKEN_SECRET?.trim() ?? "nof-mp-email-link-dev-secret";
}

function platformOrigin(): string {
  return process.env.NEXT_PUBLIC_PLATFORM_ORIGIN?.trim() || "https://forgath.ru";
}

export function signEmailLinkToken(input: SignedEmailLinkTokenPayload, explicitSecret?: string): string {
  const payload = base64UrlJson({
    exp: Math.floor(input.expiresAt.getTime() / 1000),
    jti: input.jti,
    sub: input.userId,
    typ: "nof-mp.tg-link",
  });
  const signature = crypto.createHmac("sha256", configuredEmailLinkSecret(explicitSecret)).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyEmailLinkToken(token: string, explicitSecret?: string, now = new Date()): SignedEmailLinkTokenPayload | undefined {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) {
    return undefined;
  }
  const expectedSignature = crypto.createHmac("sha256", configuredEmailLinkSecret(explicitSecret)).update(payload).digest("base64url");
  if (!safeEqual(signature, expectedSignature)) {
    return undefined;
  }

  let parsed: { exp?: unknown; jti?: unknown; sub?: unknown; typ?: unknown };
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as typeof parsed;
  } catch {
    return undefined;
  }
  if (parsed.typ !== "nof-mp.tg-link" || typeof parsed.jti !== "string" || typeof parsed.sub !== "string" || typeof parsed.exp !== "number") {
    return undefined;
  }
  const expiresAt = new Date(parsed.exp * 1000);
  if (expiresAt <= now) {
    return undefined;
  }
  return { expiresAt, jti: parsed.jti, userId: parsed.sub };
}

export class PlatformEmailLinkRepository {
  private readonly jtiFactory: () => string;
  private readonly now: () => Date;
  private readonly pool: Pool;
  private readonly tokenFactory: () => string;
  private readonly canonicalIdentityRepository: Pick<CanonicalIdentityRepository, "claimAliasesForPlatformUser">;

  constructor(
    pool = new Pool({ connectionString: platformDatabaseUrl("Platform email link"), max: 3 }),
    options: {
      canonicalIdentityRepository?: Pick<CanonicalIdentityRepository, "claimAliasesForPlatformUser">;
      jtiFactory?: () => string;
      now?: () => Date;
      tokenFactory?: () => string;
    } = {},
  ) {
    this.pool = pool;
    this.canonicalIdentityRepository = options.canonicalIdentityRepository ?? getCanonicalIdentityRepository();
    this.jtiFactory = options.jtiFactory ?? (() => crypto.randomUUID());
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
    if (user.email && !isTelegramPlaceholderEmail(user.email)) {
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

  async issueTelegramLink(input: { telegramId: number | string; telegramUsername?: string }): Promise<TelegramLinkIssueResult> {
    await this.ensureSchema();

    const telegramId = Number(input.telegramId);
    if (!Number.isFinite(telegramId) || telegramId <= 0) {
      return { ok: false, reason: "invalid_telegram_id" };
    }
    const telegramUsername = input.telegramUsername?.trim().replace(/^@+/, "") || null;

    const userResult = await this.pool.query<EmailLinkUserRow>(
      `SELECT id, username, email, telegram_id, telegram_username
       FROM dragon_forge."user"
       WHERE telegram_id = $1
       ORDER BY user_created_at ASC NULLS LAST
       LIMIT 1`,
      [telegramId],
    );
    const user = userResult.rows[0];
    if (!user) {
      return { ok: false, reason: "not_telegram_placeholder" };
    }
    if (user.email && !isTelegramPlaceholderEmail(user.email)) {
      return { ok: false, reason: "not_telegram_placeholder" };
    }

    await this.pool.query(
      `UPDATE nof_platform.email_link_tokens
       SET used_at = $2
       WHERE user_id = $1::uuid
         AND used_at IS NULL`,
      [user.id, this.now()],
    );

    const expiresAt = new Date(this.now().getTime() + telegramLinkTokenTtlMs);
    const jti = this.jtiFactory();
    const token = signEmailLinkToken({ expiresAt, jti, userId: user.id });
    await this.pool.query(
      `INSERT INTO nof_platform.email_link_tokens (user_id, token_hash, token_jti, created_by, expires_at)
       VALUES ($1::uuid, $2, $3, NULL, $4)`,
      [user.id, hashEmailLinkToken(token), jti, expiresAt],
    );

    const registerUrl = new URL("/register", platformOrigin());
    registerUrl.searchParams.set("tg", token);
    if (telegramUsername && telegramUsername !== user.telegram_username) {
      await this.pool.query(
        `UPDATE dragon_forge."user"
         SET telegram_username = $2
         WHERE id = $1::uuid
           AND (telegram_username IS NULL OR telegram_username = '')`,
        [user.id, telegramUsername],
      );
    }

    return { expiresAt, ok: true, reason: "token_created", registerUrl: registerUrl.toString(), token, userId: user.id };
  }

  async confirmLink(input: { email: string; newPassword: string; token: string }): Promise<EmailLinkConfirmResult> {
    await this.ensureSchema();

    const email = normalizePlatformEmail(input.email);
    if (!isResettableEmail(email)) {
      return { ok: false, reason: "invalid_email" };
    }

    const tokenHash = hashEmailLinkToken(input.token);
    const signedPayload = input.token.includes(".") ? verifyEmailLinkToken(input.token, undefined, this.now()) : undefined;
    if (input.token.includes(".") && !signedPayload) {
      return { ok: false, reason: "invalid_or_expired_token" };
    }
    const tokenResult = await this.pool.query<EmailLinkTokenRow>(
      `SELECT elt.id, elt.user_id, elt.expires_at, elt.used_at, u.username, u.email, u.telegram_id, u.telegram_username
       FROM nof_platform.email_link_tokens elt
       JOIN dragon_forge."user" u ON u.id = elt.user_id
       WHERE elt.token_hash = $1
         AND ($3::text IS NULL OR elt.token_jti = $3)
         AND elt.used_at IS NULL
         AND elt.expires_at > $2
       LIMIT 1`,
      [tokenHash, this.now(), signedPayload?.jti ?? null],
    );
    const token = tokenResult.rows[0];
    if (!token?.telegram_id || (token.email && !isTelegramPlaceholderEmail(token.email))) {
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
    const telegramId = Number(token.telegram_id);
    const aliases = [
      { aliasKind: "email" as const, aliasProvider: "nof-mp", aliasValue: email, verificationState: "verified" as const },
      ...(Number.isFinite(telegramId)
        ? [{ aliasKind: "telegram_id" as const, aliasProvider: "telegram", aliasValue: telegramId, verificationState: "verified" as const }]
        : []),
      ...(token.telegram_username
        ? [
            {
              aliasKind: "telegram_username" as const,
              aliasProvider: "telegram",
              aliasValue: token.telegram_username,
              verificationState: "verified" as const,
            },
          ]
        : []),
    ];
    await this.canonicalIdentityRepository.claimAliasesForPlatformUser({
      aliases,
      platformUserId: token.user_id,
    });

    return { ok: true, userId: token.user_id };
  }

  async readLinkState(input: { token: string }): Promise<EmailLinkStateResult> {
    await this.ensureSchema();

    const tokenResult = await this.pool.query<EmailLinkTokenRow>(
      `SELECT elt.id, elt.user_id, elt.expires_at, elt.used_at, u.username, u.email, u.telegram_id, u.telegram_username
       FROM nof_platform.email_link_tokens elt
       JOIN dragon_forge."user" u ON u.id = elt.user_id
       WHERE elt.token_hash = $1
         AND ($2::text IS NULL OR elt.token_jti = $2)
       LIMIT 1`,
      [hashEmailLinkToken(input.token), input.token.includes(".") ? verifyEmailLinkToken(input.token, undefined, this.now())?.jti ?? "__invalid__" : null],
    );
    const token = tokenResult.rows[0];
    const telegramId = Number(token?.telegram_id);
    if (!token || !Number.isFinite(telegramId)) {
      return { ok: false, reason: "invalid_or_expired_token" };
    }

    const expiresAt = token.expires_at instanceof Date ? token.expires_at : new Date(token.expires_at);
    const now = this.now();
    const status = token.used_at ? "used" : expiresAt <= now ? "expired" : "active";

    return {
      ok: true,
      state: {
        expiresAt,
        hasEmail: Boolean(token.email && !isTelegramPlaceholderEmail(token.email)),
        status,
        telegram: {
          id: telegramId,
          ...(token.telegram_username ? { username: token.telegram_username } : {}),
        },
        userId: token.user_id,
      },
    };
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
    await this.pool.query(`ALTER TABLE nof_platform.email_link_tokens ADD COLUMN IF NOT EXISTS token_jti text`);
    await this.pool.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS email_link_tokens_jti_unique_idx
       ON nof_platform.email_link_tokens (token_jti)
       WHERE token_jti IS NOT NULL`,
    );
  }
}

let repository: PlatformEmailLinkRepository | undefined;

export function getPlatformEmailLinkRepository(): PlatformEmailLinkRepository {
  repository ??= new PlatformEmailLinkRepository();
  return repository;
}
