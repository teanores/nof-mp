import { Pool, type QueryResultRow } from "pg";

import { defaultPortalLanguage, normalizePortalLanguage, type PortalLanguage } from "@/lib/portal-language";
import { platformDatabaseUrl } from "@/lib/server/platform-database-config";

export interface PortalUserPreferences {
  language: PortalLanguage;
}

interface UserPreferencesRow extends QueryResultRow {
  language: string | null;
}

export function platformPreferencesSchemaName(): string {
  return process.env.NOF_PLATFORM_DB_SCHEMA ?? "nof_platform";
}

export class UserPreferencesRepository {
  private initialized = false;
  private readonly pool: Pool;
  private readonly schema: string;

  constructor(pool = new Pool({ connectionString: platformDatabaseUrl("NOF Platform user preferences"), max: 3 }), schema = platformPreferencesSchemaName()) {
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
