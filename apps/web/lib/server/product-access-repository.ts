import { Pool, type QueryResultRow } from "pg";

import {
  canAccessProduct,
  type PlatformAccessSubject,
  type PlatformProductAccessPolicy,
  type PlatformRole,
  type ProductVisibility,
} from "@/lib/platform-access-contract";
import { listPlatformProjects, platformProjectRecords, projectExists } from "@/lib/platform-projects";
import type { ForgePortalSession, ForgeProject } from "@/lib/types";

const platformRoles: PlatformRole[] = ["owner", "admin", "moderator", "user", "guest"];

interface ProductAccessPool {
  query<T extends QueryResultRow = QueryResultRow>(sql: string, values?: unknown[]): Promise<{ rows: T[] }>;
}

interface ProductAccessRow extends QueryResultRow {
  created_at: Date | string;
  description: string;
  invited_user_ids: string[] | null;
  key: string;
  name: string;
  owner_user_ids: string[] | null;
  status: "active" | "archived";
  visibility: ProductVisibility;
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
    throw new Error("PostgreSQL settings are not configured for NOF Platform product access");
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
}

function schemaName(): string {
  return process.env.NOF_PLATFORM_DB_SCHEMA ?? "nof_platform";
}

function normalizePlatformRole(roleName?: string): PlatformRole {
  const normalized = roleName?.trim().toLowerCase();
  if (normalized && platformRoles.includes(normalized as PlatformRole)) {
    return normalized as PlatformRole;
  }
  return "user";
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toProduct(row: ProductAccessRow, subject: PlatformAccessSubject): ForgeProject {
  const policy: PlatformProductAccessPolicy = {
    productKey: row.key,
    visibility: row.visibility,
    invitedUserIds: row.invited_user_ids ?? [],
    ownerUserIds: row.owner_user_ids ?? [],
  };

  return {
    key: row.key,
    name: row.name,
    description: row.description,
    status: row.status,
    visibility: row.visibility,
    access: canAccessProduct(subject, policy),
    createdAt: toIso(row.created_at),
  };
}

export function subjectFromPortalSession(session: ForgePortalSession): PlatformAccessSubject {
  if (!session.authenticated || !session.user?.id) {
    return { role: "guest" };
  }

  return {
    role: normalizePlatformRole(session.user.role?.name),
    userId: session.user.id,
  };
}

export class ProductAccessRepository {
  private initialized = false;

  private constructor(
    private readonly source: "static" | "database",
    private readonly pool?: ProductAccessPool,
    private readonly schema = schemaName(),
  ) {}

  static fromStaticRegistry(): ProductAccessRepository {
    return new ProductAccessRepository("static");
  }

  static fromDatabase(pool: ProductAccessPool = new Pool({ connectionString: databaseUrl(), max: 3 }), schema = schemaName()): ProductAccessRepository {
    return new ProductAccessRepository("database", pool, schema);
  }

  async listForSubject(subject: PlatformAccessSubject): Promise<ForgeProject[]> {
    if (this.source === "static") {
      return listPlatformProjects(subject);
    }

    await this.initialize();
    const result = await this.pool!.query<ProductAccessRow>(
      `SELECT
         p.key,
         p.name,
         p.description,
         p.status,
         p.visibility,
         p.created_at,
         COALESCE(pa.invited_user_ids, ARRAY[]::TEXT[]) AS invited_user_ids,
         COALESCE(pa.owner_user_ids, ARRAY[]::TEXT[]) AS owner_user_ids
       FROM ${this.schema}.products p
       LEFT JOIN ${this.schema}.product_access pa ON pa.product_key = p.key
       ORDER BY p.created_at ASC, p.key ASC`,
    );
    return result.rows.map((row) => toProduct(row, subject));
  }

  async exists(projectKey: string): Promise<boolean> {
    if (this.source === "static") {
      return projectExists(projectKey);
    }

    await this.initialize();
    const result = await this.pool!.query<{ exists: boolean }>(`SELECT EXISTS(SELECT 1 FROM ${this.schema}.products WHERE key = $1)`, [projectKey]);
    return Boolean(result.rows[0]?.exists);
  }

  async knownProjectKeys(): Promise<string[]> {
    if (this.source === "static") {
      return platformProjectRecords.map((project) => project.key);
    }

    await this.initialize();
    const result = await this.pool!.query<{ key: string }>(`SELECT key FROM ${this.schema}.products ORDER BY key ASC`);
    return result.rows.map((row) => row.key);
  }

  private async initialize(): Promise<void> {
    if (this.initialized || this.source === "static") {
      return;
    }

    await this.pool!.query(`CREATE SCHEMA IF NOT EXISTS ${this.schema}`);
    await this.pool!.query(`
      CREATE TABLE IF NOT EXISTS ${this.schema}.products (
        key TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active',
        visibility TEXT NOT NULL DEFAULT 'registered',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await this.pool!.query(`
      CREATE TABLE IF NOT EXISTS ${this.schema}.product_access (
        product_key TEXT PRIMARY KEY REFERENCES ${this.schema}.products(key) ON DELETE CASCADE,
        invited_user_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        owner_user_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await this.seedDefaultProducts();
    this.initialized = true;
  }

  private async seedDefaultProducts(): Promise<void> {
    for (const product of platformProjectRecords) {
      await this.pool!.query(
        `INSERT INTO ${this.schema}.products (key, name, description, status, visibility, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (key)
         DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           status = EXCLUDED.status,
           visibility = EXCLUDED.visibility`,
        [product.key, product.name, product.description, product.status, product.visibility, product.createdAt],
      );
      await this.pool!.query(
        `INSERT INTO ${this.schema}.product_access (product_key, invited_user_ids, owner_user_ids, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (product_key)
         DO UPDATE SET
           invited_user_ids = EXCLUDED.invited_user_ids,
           owner_user_ids = EXCLUDED.owner_user_ids,
           updated_at = NOW()`,
        [product.key, product.invitedUserIds ?? [], product.ownerUserIds ?? []],
      );
    }
  }
}

let repository: ProductAccessRepository | undefined;

export function getProductAccessRepository(): ProductAccessRepository {
  repository ??= ProductAccessRepository.fromDatabase();
  return repository;
}