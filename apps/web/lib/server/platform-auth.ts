import crypto from "node:crypto";

import { Pool, type QueryResultRow } from "pg";

import type { ForgePortalSession, ForgePortalUser } from "@/lib/types";

const cookieName = "auth_token";
const algorithm = "HS256";
const loginUrl =
  process.env.NEXT_PUBLIC_NOF_PLATFORM_LOGIN_URL ?? process.env.NEXT_PUBLIC_DRAGON_FORGE_LOGIN_URL ?? "http://192.168.1.51:30500/login";

interface JwtPayload {
  exp?: number;
  sub?: string;
  username?: string;
}

interface PortalUserRow extends QueryResultRow {
  about_me: string | null;
  created_at: Date | string | null;
  email: string | null;
  experience: number | null;
  id: string;
  is_blocked: boolean;
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

function databaseUrl(): string {
  if (process.env.FORGE_TASKS_DATABASE_URL) {
    return process.env.FORGE_TASKS_DATABASE_URL;
  }

  const host = process.env.DB_SERVER ?? "postgres";
  const port = process.env.DB_PORT ?? "5432";
  const database = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASS;

  if (!database || !user || !password) {
    throw new Error("PostgreSQL settings are not configured for NOF platform users");
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
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

export function decodePlatformAuthToken(token: string, secret = process.env.SECRET_KEY): JwtPayload | undefined {
  if (!secret) {
    return undefined;
  }

  const [encodedHeader, encodedPayload, signature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !signature) {
    return undefined;
  }

  const header = JSON.parse(base64UrlDecode(encodedHeader).toString("utf8")) as { alg?: string };
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

  const payload = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8")) as JwtPayload;
  if (!payload.sub || !payload.username) {
    return undefined;
  }
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return undefined;
  }

  return payload;
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

function toPortalUser(row: PortalUserRow): ForgePortalUser {
  return {
    id: row.id,
    username: row.username,
    ...(row.email ? { email: row.email } : {}),
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

export class NofPlatformAuthRepository {
  private readonly pool: Pool;

  constructor(pool = new Pool({ connectionString: databaseUrl(), max: 3 })) {
    this.pool = pool;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async sessionFromCookie(token?: string): Promise<ForgePortalSession> {
    if (!token) {
      return { authenticated: false, loginUrl };
    }

    const payload = decodePlatformAuthToken(token);
    if (!payload?.sub) {
      return { authenticated: false, loginUrl };
    }

    const result = await this.pool.query<PortalUserRow>(
      `SELECT
         u.id::text AS id,
         u.username,
         u.email,
         u.about_me,
         u.experience,
         COALESCE(u.is_blocked, false) AS is_blocked,
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
       LEFT JOIN dragon_forge.level l ON l.id = u.level_id
       LEFT JOIN dragon_forge.rank r ON r.id = u.rank_id
       LEFT JOIN dragon_forge.role role ON role.id = u.role_id
       WHERE u.id = $1::uuid
       LIMIT 1`,
      [payload.sub],
    );

    const row = result.rows[0];
    if (row?.is_blocked) {
      return { authenticated: false, loginUrl };
    }

    const user = row ? toPortalUser(row) : undefined;
    return user ? { authenticated: true, loginUrl, user } : { authenticated: false, loginUrl };
  }
}

let repository: NofPlatformAuthRepository | undefined;

export function getNofPlatformAuthRepository(): NofPlatformAuthRepository {
  repository ??= new NofPlatformAuthRepository();
  return repository;
}

export { cookieName as nofPlatformAuthCookieName, loginUrl as nofPlatformLoginUrl };
