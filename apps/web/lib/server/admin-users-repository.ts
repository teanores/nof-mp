import { Pool, type QueryResultRow } from "pg";

export type AdminUserRisk = "missing-password" | "external-email" | "telegram-placeholder-email";

export interface AdminUserListItem {
  accountState: "password-login" | "telegram-only";
  createdAt?: string;
  email?: string;
  hasPassword: boolean;
  id: string;
  lastSeen?: string;
  registrationSource?: string;
  risks: AdminUserRisk[];
  role?: {
    displayName?: string;
    name: string;
  };
  telegram?: {
    id?: number;
    username?: string;
  };
  username: string;
}

interface AdminUserRow extends QueryResultRow {
  created_at: Date | string | null;
  email: string | null;
  has_password: boolean;
  id: string;
  last_seen: Date | string | null;
  registration_source: string | null;
  role_display_name: string | null;
  role_name: string | null;
  telegram_id: string | number | null;
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
    throw new Error("PostgreSQL settings are not configured for platform admin users");
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
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

export function userRisks(row: Pick<AdminUserRow, "email" | "has_password">): AdminUserRisk[] {
  const risks: AdminUserRisk[] = [];
  const email = row.email?.toLowerCase() ?? "";

  if (!row.has_password) {
    risks.push("missing-password");
  }
  if (email && !/@(?:[a-z0-9-]+\.)?forgath\.ru$/.test(email)) {
    risks.push("external-email");
  }
  if (/^\d+@telegram\.forgath\.ru$/.test(email)) {
    risks.push("telegram-placeholder-email");
  }

  return risks;
}

function toAdminUser(row: AdminUserRow): AdminUserListItem {
  const telegramId = toOptionalNumber(row.telegram_id);

  return {
    id: row.id,
    username: row.username,
    accountState: row.has_password ? "password-login" : "telegram-only",
    ...(row.email ? { email: row.email } : {}),
    hasPassword: row.has_password,
    risks: userRisks(row),
    ...(row.role_name
      ? {
          role: {
            name: row.role_name,
            ...(row.role_display_name ? { displayName: row.role_display_name } : {}),
          },
        }
      : {}),
    telegram: {
      ...(telegramId ? { id: telegramId } : {}),
      ...(row.telegram_username ? { username: row.telegram_username } : {}),
    },
    ...(row.registration_source ? { registrationSource: row.registration_source } : {}),
    ...(toIso(row.created_at) ? { createdAt: toIso(row.created_at) } : {}),
    ...(toIso(row.last_seen) ? { lastSeen: toIso(row.last_seen) } : {}),
  };
}

export class AdminUsersRepository {
  private readonly pool: Pool;

  constructor(pool = new Pool({ connectionString: databaseUrl(), max: 3 })) {
    this.pool = pool;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async listUsers(limit = 100): Promise<AdminUserListItem[]> {
    const result = await this.pool.query<AdminUserRow>(
      `SELECT
         u.id::text AS id,
         u.username,
         u.email,
         COALESCE(length(u.password_hash) > 0, false) AS has_password,
         u.telegram_id,
         u.telegram_username,
         u.registration_source,
         u.user_created_at AS created_at,
         u.last_seen,
         role.name AS role_name,
         role.display_name AS role_display_name
       FROM dragon_forge."user" u
       LEFT JOIN dragon_forge.role role ON role.id = u.role_id
       ORDER BY u.user_created_at DESC NULLS LAST, u.username ASC
       LIMIT $1`,
      [limit],
    );

    return result.rows.map(toAdminUser);
  }
}

let repository: AdminUsersRepository | undefined;

export function getAdminUsersRepository(): AdminUsersRepository {
  repository ??= new AdminUsersRepository();
  return repository;
}
