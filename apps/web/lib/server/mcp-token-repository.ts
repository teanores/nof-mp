import crypto from "node:crypto";

import { Pool, type QueryResultRow } from "pg";

import { canAccessProduct, type PlatformAccessSubject } from "@/lib/platform-access-contract";
import { mcpTokenPrefixForProject, normalizeMcpProjectKey } from "@/lib/server/mcp-project-scope";
import { platformDatabaseUrl } from "@/lib/server/platform-database-config";
import type { ForgeMcpToken, ForgeProject } from "@/lib/types";

const defaultProjectKey = "nof-tt";
const defaultScopes = ["project:read", "project:write", "wiki:write", "ideas:write"];

interface McpTokenRow extends QueryResultRow {
  created_at: Date | string;
  id: string;
  last_used_at: Date | string | null;
  name: string;
  project_key: string;
  revoked_at: Date | string | null;
  scopes: string[];
  token_prefix: string;
}

interface McpProjectRow extends QueryResultRow {
  created_at: Date | string;
  description: string | null;
  key: string;
  name: string;
  status: "active" | "archived";
}

export function mcpTokenSchemaName(): string {
  return process.env.NOF_PLATFORM_MCP_DB_SCHEMA ?? process.env.NOF_PLATFORM_DB_SCHEMA ?? "forge_tasks";
}

function tokenSecret(): string {
  return process.env.NOF_PLATFORM_MCP_TOKEN_SECRET ?? process.env.SECRET_KEY ?? "nof-mp-local-mcp-token-secret";
}

function toIso(value: Date | string | null): string | undefined {
  if (!value) {
    return undefined;
  }
  return value instanceof Date ? value.toISOString() : value;
}

function hashToken(fullToken: string): string {
  return crypto.createHmac("sha256", tokenSecret()).update(fullToken).digest("hex");
}

function toToken(row: McpTokenRow): ForgeMcpToken {
  return {
    id: row.id,
    name: row.name,
    projectKey: row.project_key,
    tokenPrefix: row.token_prefix,
    scopes: row.scopes,
    createdAt: toIso(row.created_at) ?? "",
    ...(toIso(row.last_used_at) ? { lastUsedAt: toIso(row.last_used_at) } : {}),
    ...(toIso(row.revoked_at) ? { revokedAt: toIso(row.revoked_at) } : {}),
  };
}

function toProject(row: McpProjectRow, subject: PlatformAccessSubject): ForgeProject {
  return {
    key: row.key,
    name: row.name,
    description: row.description ?? "",
    status: row.status,
    visibility: "registered",
    access: canAccessProduct(subject, { productKey: row.key, visibility: "registered" }),
    createdAt: toIso(row.created_at) ?? "",
  };
}

export class McpTokenRepository {
  private initialized = false;
  private readonly pool: Pool;
  private readonly schema: string;

  constructor(pool = new Pool({ connectionString: platformDatabaseUrl("NOF Platform MCP tokens"), max: 3 }), schema = mcpTokenSchemaName()) {
    this.pool = pool;
    this.schema = schema;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async listActive(userId: string): Promise<ForgeMcpToken[]> {
    await this.initialize();
    const result = await this.pool.query<McpTokenRow>(
      `SELECT id, user_id, project_key, name, token_prefix, scopes, created_at, last_used_at, revoked_at
       FROM ${this.schema}.mcp_tokens
       WHERE user_id = $1 AND revoked_at IS NULL
       ORDER BY created_at DESC`,
      [userId],
    );
    return result.rows.map(toToken);
  }

  async create(userId: string, input: { name: string; projectKey?: string; scopes?: string[] }): Promise<{ token: ForgeMcpToken; fullToken: string }> {
    await this.initialize();
    const projectKey = normalizeMcpProjectKey(input.projectKey ?? defaultProjectKey);
    const name = input.name.trim();
    if (!name) {
      throw new Error("Token name is required");
    }
    if (!(await this.projectExists(projectKey))) {
      throw new Error(`Project does not exist: ${projectKey}`);
    }
    const scopes = input.scopes?.length ? input.scopes : defaultScopes;
    const tokenPrefixRoot = mcpTokenPrefixForProject(projectKey);
    const fullToken = `${tokenPrefixRoot}${crypto.randomBytes(32).toString("base64url")}`;
    const tokenHash = hashToken(fullToken);
    const tokenPrefix = fullToken.slice(0, tokenPrefixRoot.length + 10);

    const result = await this.pool.query<McpTokenRow>(
      `INSERT INTO ${this.schema}.mcp_tokens (id, user_id, project_key, name, token_hash, token_prefix, scopes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, user_id, project_key, name, token_prefix, scopes, created_at, last_used_at, revoked_at`,
      [crypto.randomUUID(), userId, projectKey, name, tokenHash, tokenPrefix, scopes],
    );
    return { token: toToken(result.rows[0]), fullToken };
  }

  async revoke(userId: string, tokenId: string): Promise<boolean> {
    await this.initialize();
    const result = await this.pool.query(
      `UPDATE ${this.schema}.mcp_tokens
       SET revoked_at = NOW()
       WHERE id = $1::uuid AND user_id = $2 AND revoked_at IS NULL`,
      [tokenId, userId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async listProjectsForTokenIssuer(subject: PlatformAccessSubject): Promise<ForgeProject[]> {
    await this.initialize();
    const result = await this.pool.query<McpProjectRow>(
      `SELECT key, name, description, status, created_at
       FROM ${this.schema}.projects
       ORDER BY key ASC`,
    );
    return result.rows.map((row) => toProject(row, subject));
  }

  async projectExists(projectKey: string): Promise<boolean> {
    await this.initialize();
    const result = await this.pool.query<{ exists: boolean }>(`SELECT EXISTS(SELECT 1 FROM ${this.schema}.projects WHERE key = $1)`, [projectKey]);
    return Boolean(result.rows[0]?.exists);
  }

  async resolve(fullToken: string): Promise<{ projectKey: string; scopes: string[]; tokenId: string; userId: string } | undefined> {
    await this.initialize();
    const result = await this.pool.query<McpTokenRow & { token_hash: string; user_id: string }>(
      `SELECT id, user_id, project_key, name, token_hash, token_prefix, scopes, created_at, last_used_at, revoked_at
       FROM ${this.schema}.mcp_tokens
       WHERE revoked_at IS NULL AND $1 LIKE token_prefix || '%'
       ORDER BY created_at DESC`,
      [fullToken],
    );
    const tokenHash = hashToken(fullToken);
    const row = result.rows.find((candidate) => candidate.token_hash === tokenHash);
    if (!row) {
      return undefined;
    }
    void this.pool.query(`UPDATE ${this.schema}.mcp_tokens SET last_used_at = NOW() WHERE id = $1`, [row.id]).catch(() => undefined);
    return { projectKey: row.project_key, scopes: row.scopes, tokenId: row.id, userId: row.user_id };
  }

  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS ${this.schema}`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.schema}.mcp_tokens (
        id UUID PRIMARY KEY,
        user_id TEXT NOT NULL,
        project_key TEXT NOT NULL,
        name TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        token_prefix TEXT NOT NULL,
        scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_used_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ
      )
    `);
    await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_forge_mcp_tokens_user_active ON ${this.schema}.mcp_tokens(user_id, revoked_at, created_at DESC)`);
    await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_forge_mcp_tokens_project ON ${this.schema}.mcp_tokens(project_key)`);
    this.initialized = true;
  }
}

let repository: McpTokenRepository | undefined;

export function getMcpTokenRepository(): McpTokenRepository {
  repository ??= new McpTokenRepository();
  return repository;
}
