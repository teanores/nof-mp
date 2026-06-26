import crypto from "node:crypto";

import { Pool, type QueryResultRow } from "pg";

import { platformDatabaseUrl } from "@/lib/server/platform-database-config";
import type { ForgePortalSession, ForgePortalUser } from "@/lib/types";

const cookieName = "auth_token";
const algorithm = "HS256";
const loginUrl = process.env.NEXT_PUBLIC_NOF_LOGIN_URL ?? "/login";

interface JwtPayload {
  exp?: number;
  sub?: string;
  username?: string;
}

interface PortalUserRow extends QueryResultRow {
  about_me: string | null;
  access_denied: boolean | null;
  created_at: Date | string | null;
  email: string | null;
  email_verified: boolean | string | null;
  experience: number | null;
  id: string;
  last_seen: Date | string | null;
  level_id: number | null;
  level_name: string | null;
  level_number: number | null;
  rank_id: number | null;
  rank_name: string | null;
  rank_number: number | null;
  registration_source: string | null;
  role_display_name: string | null;
  role_id: number | null;
  role_name: string | null;
  telegram_firstname: string | null;
  telegram_id: string | number | null;
  telegram_language_code: string | null;
  telegram_lastname: string | null;
  telegram_username: string | null;
  username: string;
}

function base64UrlDecode(value: string): Buffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(`${normalized}${padding}`, "base64");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function authVerificationSecrets(explicitSecret?: string): string[] {
  const candidates = explicitSecret
    ? [explicitSecret]
    : [process.env.NOF_AUTH_SECRET_KEY, process.env.SECRET_KEY, process.env.NOF_AUTH_SECRET_KEY_PREVIOUS, process.env.SECRET_KEY_PREVIOUS];
  return [...new Set(candidates.filter((value): value is string => Boolean(value)))];
}

function decodeNofAuthTokenWithSecret(token: string, secret: string): JwtPayload | undefined {
  const [encodedHeader, encodedPayload, signature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !signature) {
    return undefined;
  }

  let header: { alg?: string };
  let payload: JwtPayload;

  try {
    header = JSON.parse(base64UrlDecode(encodedHeader).toString("utf8")) as { alg?: string };
    payload = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8")) as JwtPayload;
  } catch {
    return undefined;
  }

  if (header.alg !== algorithm) {
    return undefined;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  if (!safeEqual(signature, expectedSignature)) {
    return undefined;
  }

  if (!payload.sub || !payload.username) {
    return undefined;
  }
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return undefined;
  }

  return payload;
}

export function decodeNofAuthToken(token: string, secret?: string): JwtPayload | undefined {
  for (const candidate of authVerificationSecrets(secret)) {
    const payload = decodeNofAuthTokenWithSecret(token, candidate);
    if (payload) {
      return payload;
    }
  }

  return undefined;
}

function toIso(value: Date | string | null): string | undefined {
  if (!value) {
    return undefined;
  }
  return value instanceof Date ? value.toISOString() : value;
}

function toOptionalNumber(value: number | string | null): number | undefined {
  if (value === null) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toOptionalBoolean(value: boolean | string | null): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") {
      return true;
    }
    if (value.toLowerCase() === "false") {
      return false;
    }
  }
  return undefined;
}

function emailVerified(row: PortalUserRow): boolean {
  const explicit = toOptionalBoolean(row.email_verified);
  if (typeof explicit === "boolean") {
    return explicit;
  }
  return row.registration_source === "nof-mp-email" || row.registration_source === "telegram-email-link";
}

function toPortalUser(row: PortalUserRow): ForgePortalUser {
  return {
    id: row.id,
    username: row.username,
    ...(row.email ? { email: row.email } : {}),
    ...(row.email ? { emailVerified: emailVerified(row) } : {}),
    ...(row.about_me ? { aboutMe: row.about_me } : {}),
    experience: row.experience ?? 0,
    ...(row.level_name
      ? {
          level: {
            id: row.level_id ?? undefined,
            name: row.level_name,
            number: row.level_number ?? undefined,
          },
        }
      : {}),
    ...(row.rank_name
      ? {
          rank: {
            id: row.rank_id ?? undefined,
            name: row.rank_name,
            number: row.rank_number ?? undefined,
          },
        }
      : {}),
    ...(row.role_name && row.role_id
      ? {
          role: {
            id: row.role_id,
            name: row.role_name,
            ...(row.role_display_name ? { displayName: row.role_display_name } : {}),
          },
        }
      : {}),
    telegram: {
      ...(toOptionalNumber(row.telegram_id) ? { id: toOptionalNumber(row.telegram_id) } : {}),
      ...(row.telegram_username ? { username: row.telegram_username } : {}),
      ...(row.telegram_firstname ? { firstName: row.telegram_firstname } : {}),
      ...(row.telegram_lastname ? { lastName: row.telegram_lastname } : {}),
      ...(row.telegram_language_code ? { languageCode: row.telegram_language_code } : {}),
    },
    ...(row.registration_source ? { registrationSource: row.registration_source } : {}),
    ...(toIso(row.created_at) ? { createdAt: toIso(row.created_at) } : {}),
    ...(toIso(row.last_seen) ? { lastSeen: toIso(row.last_seen) } : {}),
  };
}

export class NofPortalAuthRepository {
  private readonly pool: Pool;

  constructor(pool = new Pool({ connectionString: platformDatabaseUrl("NOF portal users"), max: 3 })) {
    this.pool = pool;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async userById(userId: string): Promise<ForgePortalUser | undefined> {
    const result = await this.pool.query<PortalUserRow>(
      `SELECT
         u.id::text AS id,
         u.username,
         u.email,
         COALESCE(access.access_denied, false) AS access_denied,
         (to_jsonb(u)->>'email_verified') AS email_verified,
         u.about_me,
         u.experience,
         u.telegram_id,
         u.telegram_username,
         u.telegram_firstname,
         u.telegram_lastname,
         u.telegram_language_code,
         u.registration_source,
         u.user_created_at AS created_at,
         u.last_seen,
         l.id AS level_id,
         l.level_id AS level_number,
         l.level_name,
         r.id AS rank_id,
         r.rank_id AS rank_number,
         r.rank_name,
         role.id AS role_id,
         role.name AS role_name,
         role.display_name AS role_display_name
       FROM dragon_forge."user" u
       LEFT JOIN nof_platform.user_access_state access ON access.user_id = u.id
       LEFT JOIN dragon_forge.level l ON l.id = u.level_id
       LEFT JOIN dragon_forge.rank r ON r.id = u.rank_id
       LEFT JOIN dragon_forge.role role ON role.id = u.role_id
       WHERE u.id = $1::uuid
       LIMIT 1`,
      [userId],
    );

    const row = result.rows[0];
    if (!row || row.access_denied) {
      return undefined;
    }

    return toPortalUser(row);
  }

  async sessionFromCookie(token?: string): Promise<ForgePortalSession> {
    if (!token) {
      return { authenticated: false, loginUrl };
    }

    const payload = decodeNofAuthToken(token);
    if (!payload?.sub) {
      return { authenticated: false, loginUrl };
    }

    const user = await this.userById(payload.sub);
    return user ? { authenticated: true, loginUrl, user } : { authenticated: false, loginUrl };
  }
}

let repository: NofPortalAuthRepository | undefined;

export function getNofPortalAuthRepository(): NofPortalAuthRepository {
  repository ??= new NofPortalAuthRepository();
  return repository;
}

export { cookieName as AUTH_COOKIE_NAME, loginUrl as NOF_LOGIN_URL };
