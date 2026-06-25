import { Pool, type QueryResultRow } from "pg";

import { isServiceEmail, isTelegramPlaceholderEmail } from "@/lib/server/email-address-policy";
import { platformDatabaseUrl } from "@/lib/server/platform-database-config";

export type AdminUserRisk = "missing-password" | "external-email" | "telegram-placeholder-email";
export type AdminUserRecoveryState = "email-reset-ready" | "missing-email" | "service-email";

export interface AdminUserListItem {
  accountState: "password-login" | "telegram-only";
  accessState: "active" | "denied";
  createdAt?: string;
  email?: string;
  hasPassword: boolean;
  id: string;
  lastSeen?: string;
  recoveryState: AdminUserRecoveryState;
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

export interface AdminUserAccessStateInput {
  actorUserId: string;
  denied: boolean;
  reason?: string;
  userId: string;
}

export interface AdminUserDeleteInput {
  actorUserId: string;
  userId: string;
}

export interface AdminUserCanonicalMergeInput {
  actorUserId: string;
  sourceUserId: string;
  targetUserId: string;
}

export interface AdminUserCanonicalMergeResult {
  sourceUserId: string;
  targetUserId: string;
}

export interface AdminUserIdentityLinkInput {
  actorUserId: string;
  email: string;
  telegramId: number;
  telegramUsername?: string;
  userId: string;
}

interface AdminUserRow extends QueryResultRow {
  access_denied: boolean | null;
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
  if (isTelegramPlaceholderEmail(email)) {
    risks.push("telegram-placeholder-email");
  }

  return risks;
}

export function userRecoveryState(row: Pick<AdminUserRow, "email">): AdminUserRecoveryState {
  const email = row.email?.toLowerCase() ?? "";
  if (!email) {
    return "missing-email";
  }
  if (isServiceEmail(email)) {
    return "service-email";
  }
  return "email-reset-ready";
}

function toAdminUser(row: AdminUserRow): AdminUserListItem {
  const telegramId = toOptionalNumber(row.telegram_id);
  const displayEmail = row.email && !isServiceEmail(row.email) ? row.email : undefined;

  return {
    id: row.id,
    username: row.username,
    accountState: row.has_password ? "password-login" : "telegram-only",
    accessState: row.access_denied ? "denied" : "active",
    ...(displayEmail ? { email: displayEmail } : {}),
    hasPassword: row.has_password,
    recoveryState: userRecoveryState(row),
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

  constructor(pool = new Pool({ connectionString: platformDatabaseUrl("platform admin users"), max: 3 })) {
    this.pool = pool;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async listUsers(limit = 100): Promise<AdminUserListItem[]> {
    await this.ensureAccessStateSchema();
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
         COALESCE(access.access_denied, false) AS access_denied,
         role.name AS role_name,
         role.display_name AS role_display_name
       FROM dragon_forge."user" u
       LEFT JOIN dragon_forge.role role ON role.id = u.role_id
       LEFT JOIN nof_platform.user_access_state access ON access.user_id = u.id
       ORDER BY u.user_created_at DESC NULLS LAST, u.username ASC
       LIMIT $1`,
      [limit],
    );

    return result.rows.map(toAdminUser);
  }

  async getUserById(userId: string): Promise<AdminUserListItem | null> {
    await this.ensureAccessStateSchema();
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
         COALESCE(access.access_denied, false) AS access_denied,
         role.name AS role_name,
         role.display_name AS role_display_name
       FROM dragon_forge."user" u
       LEFT JOIN dragon_forge.role role ON role.id = u.role_id
       LEFT JOIN nof_platform.user_access_state access ON access.user_id = u.id
       WHERE u.id::text = $1
       LIMIT 1`,
      [userId],
    );

    return result.rows[0] ? toAdminUser(result.rows[0]) : null;
  }

  async setAccessState(input: AdminUserAccessStateInput): Promise<AdminUserListItem | null> {
    await this.ensureAccessStateSchema();
    const existing = await this.getUserById(input.userId);
    if (!existing) {
      return null;
    }

    await this.pool.query(
      `INSERT INTO nof_platform.user_access_state (user_id, access_denied, reason, denied_at, restored_at, updated_by, updated_at)
       VALUES ($1::uuid, $2, $3, CASE WHEN $2 THEN NOW() ELSE NULL END, CASE WHEN $2 THEN NULL ELSE NOW() END, $4::uuid, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         access_denied = EXCLUDED.access_denied,
         reason = EXCLUDED.reason,
         denied_at = CASE WHEN EXCLUDED.access_denied THEN COALESCE(nof_platform.user_access_state.denied_at, NOW()) ELSE NULL END,
         restored_at = CASE WHEN EXCLUDED.access_denied THEN NULL ELSE NOW() END,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()`,
      [input.userId, input.denied, input.reason?.trim() || null, input.actorUserId],
    );

    return this.getUserById(input.userId);
  }

  async deleteUser(input: AdminUserDeleteInput): Promise<Pick<AdminUserListItem, "id" | "username"> | null> {
    await this.ensureAccessStateSchema();
    const existing = await this.getUserById(input.userId);
    if (!existing) {
      return null;
    }

    await this.pool.query("BEGIN");
    try {
      await this.pool.query(`DELETE FROM nof_platform.user_access_state WHERE user_id = $1::uuid`, [input.userId]);
      await this.deleteFromOptionalTable("nof_platform.email_link_tokens", "user_id", input.userId);
      await this.deleteFromOptionalTable("nof_platform.password_reset_tokens", "user_id", input.userId);
      await this.deleteFromOptionalTable("nof_platform.mcp_tokens", "user_id", input.userId);
      await this.deleteFromOptionalTable("nof_platform.platform_service_links", "platform_user_id", input.userId);
      await this.pool.query(`DELETE FROM dragon_forge."user" WHERE id = $1::uuid`, [input.userId]);
      await this.pool.query("COMMIT");
    } catch (error) {
      await this.pool.query("ROLLBACK");
      throw error;
    }

    return { id: existing.id, username: existing.username };
  }

  async mergeUserIntoCanonical(input: AdminUserCanonicalMergeInput): Promise<AdminUserCanonicalMergeResult | null> {
    await this.ensureAccessStateSchema();
    await this.ensureIdentityMergeSchema();

    const source = await this.getUserById(input.sourceUserId);
    const target = await this.getUserById(input.targetUserId);
    if (!source || !target) {
      return null;
    }

    await this.pool.query("BEGIN");
    try {
      await this.pool.query(
        `UPDATE dragon_forge."user" target
         SET
           email = CASE
             WHEN (target.email IS NULL OR target.email = '')
              AND source.email IS NOT NULL
              AND source.email !~ '^[0-9]+@?telegram\\.(example\\.com|forgath\\.ru)$'
             THEN source.email
             ELSE target.email
           END,
           telegram_id = COALESCE(target.telegram_id, source.telegram_id),
           telegram_username = COALESCE(target.telegram_username, source.telegram_username)
         FROM dragon_forge."user" source
         WHERE target.id = $1::uuid
           AND source.id = $2::uuid`,
        [input.targetUserId, input.sourceUserId],
      );
      await this.pool.query(
        `INSERT INTO nof_platform.user_identity_merge (source_user_id, target_user_id, merged_by, reason, created_at)
         VALUES ($1::uuid, $2::uuid, $3::uuid, 'duplicate_merged', NOW())`,
        [input.sourceUserId, input.targetUserId, input.actorUserId],
      );
      await this.pool.query(
        `INSERT INTO nof_platform.user_access_state (user_id, access_denied, reason, denied_at, restored_at, updated_by, updated_at)
         VALUES ($1::uuid, true, 'duplicate_merged', NOW(), NULL, $2::uuid, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           access_denied = true,
           reason = 'duplicate_merged',
           denied_at = COALESCE(nof_platform.user_access_state.denied_at, NOW()),
           restored_at = NULL,
           updated_by = EXCLUDED.updated_by,
           updated_at = NOW()`,
        [input.sourceUserId, input.actorUserId],
      );
      await this.pool.query("COMMIT");
    } catch (error) {
      await this.pool.query("ROLLBACK");
      throw error;
    }

    return { sourceUserId: source.id, targetUserId: target.id };
  }

  async updateUserIdentityLink(input: AdminUserIdentityLinkInput): Promise<AdminUserListItem | null> {
    await this.ensureAccessStateSchema();
    const existing = await this.getUserById(input.userId);
    if (!existing) {
      return null;
    }

    await this.pool.query(
      `UPDATE dragon_forge."user"
       SET email = $2,
           telegram_id = $3,
           telegram_username = NULLIF($4, ''),
           registration_source = COALESCE(registration_source, 'admin-identity-link')
       WHERE id = $1::uuid`,
      [input.userId, input.email, input.telegramId, input.telegramUsername?.trim() ?? ""],
    );

    return this.getUserById(input.userId);
  }

  private async deleteFromOptionalTable(tableName: string, userColumn: string, userId: string): Promise<void> {
    const exists = await this.pool.query<{ table_exists: boolean }>(`SELECT to_regclass($1) IS NOT NULL AS table_exists`, [tableName]);
    if (!exists.rows[0]?.table_exists) {
      return;
    }
    await this.pool.query(`DELETE FROM ${tableName} WHERE ${userColumn} = $1::uuid`, [userId]);
  }

  async isAccessDenied(userId: string): Promise<boolean> {
    await this.ensureAccessStateSchema();
    const result = await this.pool.query<{ access_denied: boolean }>(
      `SELECT COALESCE(access_denied, false) AS access_denied
       FROM nof_platform.user_access_state
       WHERE user_id = $1::uuid
       LIMIT 1`,
      [userId],
    );
    return Boolean(result.rows[0]?.access_denied);
  }

  private async ensureAccessStateSchema(): Promise<void> {
    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS nof_platform`);
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS nof_platform.user_access_state (
        user_id uuid PRIMARY KEY,
        access_denied boolean NOT NULL DEFAULT false,
        reason text,
        denied_at timestamptz,
        restored_at timestamptz,
        updated_by uuid,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
    );
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS user_access_state_denied_idx
       ON nof_platform.user_access_state (access_denied, updated_at DESC)`,
    );
  }

  private async ensureIdentityMergeSchema(): Promise<void> {
    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS nof_platform`);
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS nof_platform.user_identity_merge (
        id bigserial PRIMARY KEY,
        source_user_id uuid NOT NULL,
        target_user_id uuid NOT NULL,
        merged_by uuid,
        reason text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
    );
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS user_identity_merge_source_idx
       ON nof_platform.user_identity_merge (source_user_id, created_at DESC)`,
    );
  }
}

let repository: AdminUsersRepository | undefined;

export function getAdminUsersRepository(): AdminUsersRepository {
  repository ??= new AdminUsersRepository();
  return repository;
}
