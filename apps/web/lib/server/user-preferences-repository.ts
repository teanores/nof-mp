import { Pool, type QueryResultRow } from "pg";

import { defaultPortalLanguage, normalizePortalLanguage, type PortalLanguage } from "@/lib/portal-language";

export interface PortalUserPreferences {
  language: PortalLanguage;
}

interface UserPreferencesRow extends QueryResultRow {
  language: string | null;
}

function databaseUrl(): string {
  const configuredUrl = process.env.NOF_PLATFORM_DATABASE_URL ?? process.env.FORGE_TASKS_DATABASE_URL;
  if (configuredUrl) {
    return configuredUrl;
  }

  const host = process.env.DB_SERVER ?? "postgres";
  const port = process.env.DB_PORT ?? "5432";
  const database = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASS;

  if (!database || !user || !password) {
    throw new Error("PostgreSQL settings are not configured for NOF Platform user preferences");
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
}

export function platformPreferencesSchemaName(): string {
  return process.env.NOF_PLATFORM_DB_SCHEMA ?? "nof_platform";
}

export class UserPreferencesRepository {
  private initialized = false;
  private readonly pool: Pool;
  private readonly schema: string;

  constructor(pool = new Pool({ connectionString: databaseUrl(), max: 3 }), schema = platformPreferencesSchemaName()) {
    this.pool = pool;
    this.schema = schema;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async get(userId: string): Promise<PortalUserPreferences> {
    await this.initialize();
    const result = await this.pool.query<UserPreferencesRow>(
      `SELECT language
       FROM ${this.schema}.user_preferences
       WHERE user_id = $1
       LIMIT 1`,
      [userId],
    );
    return { language: normalizePortalLanguage(result.rows[0]?.language) };
  }

  async upsert(userId: string, preferences: PortalUserPreferences): Promise<PortalUserPreferences> {
    await this.initialize();
    const language = normalizePortalLanguage(preferences.language);
    const result = await this.pool.query<UserPreferencesRow>(
      `INSERT INTO ${this.schema}.user_preferences (user_id, language, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET language = EXCLUDED.language, updated_at = NOW()
       RETURNING language`,
      [userId, language],
    );
    return { language: normalizePortalLanguage(result.rows[0]?.language) };
  }

  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS ${this.schema}`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.schema}.user_preferences (
        user_id TEXT PRIMARY KEY,
        language TEXT NOT NULL DEFAULT '${defaultPortalLanguage}',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    this.initialized = true;
  }
}

let repository: UserPreferencesRepository | undefined;

export function getUserPreferencesRepository(): UserPreferencesRepository {
  repository ??= new UserPreferencesRepository();
  return repository;
}