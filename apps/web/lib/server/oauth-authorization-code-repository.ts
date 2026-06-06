import { randomUUID } from "node:crypto";

import { Pool, type QueryResultRow } from "pg";

import { platformDatabaseUrl } from "@/lib/server/platform-database-config";

interface OAuthAuthorizationCodePool {
  query<T extends QueryResultRow = QueryResultRow>(sql: string, values?: unknown[]): Promise<{ rows: T[] }>;
}

export interface IssueOAuthAuthorizationCodeInput {
  clientId: string;
  nonce: string;
  platformUserId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  ttlSeconds: number;
}

export interface OAuthAuthorizationCodeRecord extends Omit<IssueOAuthAuthorizationCodeInput, "ttlSeconds"> {
  code: string;
  expiresAt: string;
  usedAt?: string;
}

export type RedeemOAuthAuthorizationCodeResult =
  | { ok: true; record: OAuthAuthorizationCodeRecord }
  | { error: "not_found" | "already_used" | "expired" | "client_mismatch" | "redirect_uri_mismatch"; ok: false };

export interface RedeemOAuthAuthorizationCodeInput {
  clientId: string;
  code: string;
  redirectUri: string;
}

export interface OAuthAuthorizationCodeRepository {
  issue(input: IssueOAuthAuthorizationCodeInput): Promise<OAuthAuthorizationCodeRecord>;
  redeem(input: RedeemOAuthAuthorizationCodeInput): Promise<RedeemOAuthAuthorizationCodeResult>;
}

function schemaName(): string {
  return process.env.NOF_PLATFORM_DB_SCHEMA ?? "nof_platform";
}

function safeSqlIdentifier(identifier: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error("Invalid SQL identifier for NOF Platform OAuth authorization codes");
  }
  return identifier;
}

function nowIso(now: Date): string {
  return now.toISOString();
}

function expirationIso(now: Date, ttlSeconds: number): string {
  return new Date(now.getTime() + ttlSeconds * 1000).toISOString();
}

function generateCode(): string {
  return `oauth_code_${randomUUID().replaceAll("-", "")}`;
}

function redeemRecord(
  record: OAuthAuthorizationCodeRecord | undefined,
  input: RedeemOAuthAuthorizationCodeInput,
  now: Date,
): RedeemOAuthAuthorizationCodeResult {
  if (!record) {
    return { error: "not_found", ok: false };
  }
  if (record.usedAt) {
    return { error: "already_used", ok: false };
  }
  if (record.clientId !== input.clientId) {
    return { error: "client_mismatch", ok: false };
  }
  if (record.redirectUri !== input.redirectUri) {
    return { error: "redirect_uri_mismatch", ok: false };
  }
  if (Date.parse(record.expiresAt) <= now.getTime()) {
    return { error: "expired", ok: false };
  }

  return { ok: true, record: { ...record, usedAt: nowIso(now) } };
}

export class InMemoryOAuthAuthorizationCodeRepository implements OAuthAuthorizationCodeRepository {
  private readonly records = new Map<string, OAuthAuthorizationCodeRecord>();

  constructor(private readonly now: () => Date = () => new Date()) {}

  async issue(input: IssueOAuthAuthorizationCodeInput): Promise<OAuthAuthorizationCodeRecord> {
    const record: OAuthAuthorizationCodeRecord = {
      ...input,
      code: generateCode(),
      expiresAt: expirationIso(this.now(), input.ttlSeconds),
    };
    this.records.set(record.code, record);
    return record;
  }

  async redeem(input: RedeemOAuthAuthorizationCodeInput): Promise<RedeemOAuthAuthorizationCodeResult> {
    const result = redeemRecord(this.records.get(input.code), input, this.now());
    if (result.ok) {
      this.records.set(input.code, result.record);
    }
    return result;
  }

  importRecord(record: OAuthAuthorizationCodeRecord): void {
    this.records.set(record.code, record);
  }
}

interface OAuthAuthorizationCodeRow extends QueryResultRow {
  client_id: string;
  code: string;
  expires_at: Date | string;
  nonce: string;
  platform_user_id: string;
  redirect_uri: string;
  scopes: string[];
  state: string;
  used_at: Date | string | null;
}

function rowToRecord(row: OAuthAuthorizationCodeRow): OAuthAuthorizationCodeRecord {
  const usedAt = row.used_at instanceof Date ? row.used_at.toISOString() : row.used_at;
  const expiresAt = row.expires_at instanceof Date ? row.expires_at.toISOString() : row.expires_at;
  return {
    clientId: row.client_id,
    code: row.code,
    expiresAt,
    nonce: row.nonce,
    platformUserId: row.platform_user_id,
    redirectUri: row.redirect_uri,
    scopes: row.scopes,
    state: row.state,
    ...(usedAt ? { usedAt } : {}),
  };
}

export class PostgresOAuthAuthorizationCodeRepository implements OAuthAuthorizationCodeRepository {
  private initialized = false;

  constructor(
    private readonly pool: OAuthAuthorizationCodePool = new Pool({
      connectionString: platformDatabaseUrl("NOF Platform OAuth authorization codes"),
      max: 3,
    }),
    schema = schemaName(),
    private readonly now: () => Date = () => new Date(),
  ) {
    this.schema = safeSqlIdentifier(schema);
  }

  private readonly schema: string;

  async issue(input: IssueOAuthAuthorizationCodeInput): Promise<OAuthAuthorizationCodeRecord> {
    await this.initialize();
    const record: OAuthAuthorizationCodeRecord = {
      ...input,
      code: generateCode(),
      expiresAt: expirationIso(this.now(), input.ttlSeconds),
    };

    await this.pool.query(
      `INSERT INTO ${this.schema}.oauth_authorization_codes
       (code, client_id, platform_user_id, redirect_uri, scopes, state, nonce, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [record.code, record.clientId, record.platformUserId, record.redirectUri, record.scopes, record.state, record.nonce, record.expiresAt],
    );

    return record;
  }

  async redeem(input: RedeemOAuthAuthorizationCodeInput): Promise<RedeemOAuthAuthorizationCodeResult> {
    await this.initialize();
    const result = await this.pool.query<OAuthAuthorizationCodeRow>(
      `SELECT code, client_id, platform_user_id, redirect_uri, scopes, state, nonce, expires_at, used_at
       FROM ${this.schema}.oauth_authorization_codes
       WHERE code = $1
       LIMIT 1`,
      [input.code],
    );

    const redeemResult = redeemRecord(result.rows[0] ? rowToRecord(result.rows[0]) : undefined, input, this.now());
    if (redeemResult.ok) {
      const updateResult = await this.pool.query<OAuthAuthorizationCodeRow>(
        `UPDATE ${this.schema}.oauth_authorization_codes
         SET used_at = $1
         WHERE code = $2 AND used_at IS NULL
         RETURNING code, client_id, platform_user_id, redirect_uri, scopes, state, nonce, expires_at, used_at`,
        [redeemResult.record.usedAt, input.code],
      );
      if (!updateResult.rows[0]) {
        return { error: "already_used", ok: false };
      }
      return { ok: true, record: rowToRecord(updateResult.rows[0]) };
    }

    return redeemResult;
  }

  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS ${this.schema}`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.schema}.oauth_authorization_codes (
        code TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        platform_user_id TEXT NOT NULL,
        redirect_uri TEXT NOT NULL,
        scopes TEXT[] NOT NULL,
        state TEXT NOT NULL,
        nonce TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    this.initialized = true;
  }
}

let repository: OAuthAuthorizationCodeRepository | undefined;

export function getOAuthAuthorizationCodeRepository(): OAuthAuthorizationCodeRepository {
  repository ??= new PostgresOAuthAuthorizationCodeRepository();
  return repository;
}
