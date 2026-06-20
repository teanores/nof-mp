import { Pool, type QueryResultRow } from "pg";

import { platformDatabaseUrl } from "@/lib/server/platform-database-config";

interface SettingRow extends QueryResultRow {
  value: unknown;
}

interface PlatformSettingsPool {
  query<T extends QueryResultRow = QueryResultRow>(sql: string, values?: unknown[]): Promise<{ rows: T[] }>;
}

export interface PlatformSettings {
  registrationPaused: boolean;
}

function schemaName(): string {
  return process.env.NOF_PLATFORM_DB_SCHEMA ?? "nof_platform";
}

function safeSqlIdentifier(identifier: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error("Invalid SQL identifier for NOF Platform settings");
  }
  return identifier;
}

function booleanFromJson(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (value && typeof value === "object" && "value" in value && typeof value.value === "boolean") {
    return value.value;
  }
  return fallback;
}

export class PlatformSettingsRepository {
  private initialized = false;
  private readonly pool: PlatformSettingsPool;
  private readonly schema: string;

  constructor(
    pool: PlatformSettingsPool = new Pool({ connectionString: platformDatabaseUrl("NOF Platform settings"), max: 2 }),
    schema = schemaName(),
  ) {
    this.pool = pool;
    this.schema = safeSqlIdentifier(schema);
  }

  async getSettings(): Promise<PlatformSettings> {
    return { registrationPaused: await this.isRegistrationPaused() };
  }

  async isRegistrationPaused(): Promise<boolean> {
    await this.initialize();
    const result = await this.pool.query<SettingRow>(`SELECT value FROM ${this.schema}.platform_settings WHERE key = $1`, ["registration_paused"]);
    return booleanFromJson(result.rows[0]?.value, true);
  }

  async setRegistrationPaused(value: boolean, updatedBy?: string): Promise<PlatformSettings> {
    await this.initialize();
    await this.pool.query(
      `INSERT INTO ${this.schema}.platform_settings (key, value, updated_at, updated_by)
       VALUES ($1, $2::jsonb, NOW(), $3)
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
      ["registration_paused", JSON.stringify({ value }), updatedBy ?? null],
    );
    return { registrationPaused: value };
  }

  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS ${this.schema}`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.schema}.platform_settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by TEXT
      )
    `);
    await this.pool.query(
      `INSERT INTO ${this.schema}.platform_settings (key, value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO NOTHING`,
      ["registration_paused", JSON.stringify({ value: true })],
    );
    this.initialized = true;
  }
}

let repository: PlatformSettingsRepository | undefined;

export function getPlatformSettingsRepository(): PlatformSettingsRepository {
  repository ??= new PlatformSettingsRepository();
  return repository;
}
