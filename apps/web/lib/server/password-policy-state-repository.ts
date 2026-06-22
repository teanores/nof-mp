import { Pool, type QueryResultRow } from "pg";

import { platformDatabaseUrl } from "@/lib/server/platform-database-config";

interface PasswordPolicyStateRow extends QueryResultRow {
  must_rotate_password: boolean;
  reason: string | null;
}

export interface PasswordPolicyState {
  mustRotatePassword: boolean;
  reason?: string;
}

export class PasswordPolicyStateRepository {
  private readonly pool: Pool;
  private readonly schema: string;

  constructor(pool = new Pool({ connectionString: platformDatabaseUrl("Password policy state"), max: 3 }), schema = "nof_platform") {
    this.pool = pool;
    this.schema = schema;
  }

  async stateForUser(userId: string): Promise<PasswordPolicyState> {
    await this.ensureSchema();
    const result = await this.pool.query<PasswordPolicyStateRow>(
      `SELECT must_rotate_password, reason
       FROM ${this.schema}.password_policy_state
       WHERE user_id = $1::uuid
       LIMIT 1`,
      [userId],
    );
    const row = result.rows[0];
    return row ? { mustRotatePassword: row.must_rotate_password, ...(row.reason ? { reason: row.reason } : {}) } : { mustRotatePassword: false };
  }

  async clearRotationRequirement(userId: string): Promise<void> {
    await this.ensureSchema();
    await this.pool.query(
      `INSERT INTO ${this.schema}.password_policy_state (user_id, must_rotate_password, reason, cleared_at, updated_at)
       VALUES ($1::uuid, false, NULL, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         must_rotate_password = false,
         reason = NULL,
         cleared_at = NOW(),
         updated_at = NOW()`,
      [userId],
    );
  }

  async requireRotation(input: { reason: string; userId: string }): Promise<void> {
    await this.ensureSchema();
    await this.pool.query(
      `INSERT INTO ${this.schema}.password_policy_state (user_id, must_rotate_password, reason, marked_at, updated_at)
       VALUES ($1::uuid, true, $2, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         must_rotate_password = true,
         reason = EXCLUDED.reason,
         marked_at = COALESCE(${this.schema}.password_policy_state.marked_at, NOW()),
         updated_at = NOW(),
         cleared_at = NULL`,
      [input.userId, input.reason],
    );
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private async ensureSchema(): Promise<void> {
    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS ${this.schema}`);
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS ${this.schema}.password_policy_state (
        user_id uuid PRIMARY KEY,
        must_rotate_password boolean NOT NULL DEFAULT false,
        reason text,
        marked_at timestamptz,
        cleared_at timestamptz,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
    );
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS password_policy_state_rotation_idx
       ON ${this.schema}.password_policy_state (must_rotate_password, updated_at DESC)`,
    );
  }
}

let repository: PasswordPolicyStateRepository | undefined;

export function getPasswordPolicyStateRepository(): PasswordPolicyStateRepository {
  repository ??= new PasswordPolicyStateRepository();
  return repository;
}
