import { randomUUID } from "node:crypto";

import { Pool, type QueryResultRow } from "pg";

interface OAuthConsentChallengePool {
  query<T extends QueryResultRow = QueryResultRow>(sql: string, values?: unknown[]): Promise<{ rows: T[] }>;
}

export interface IssueOAuthConsentChallengeInput {
  clientId: string;
  nonce: string;
  platformUserId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  ttlSeconds: number;
}

export interface OAuthConsentChallengeRecord extends Omit<IssueOAuthConsentChallengeInput, "ttlSeconds"> {
  challengeId: string;
  expiresAt: string;
  usedAt?: string;
}

export interface ConsumeOAuthConsentChallengeInput {
  challengeId: string;
  platformUserId: string;
}

export type ConsumeOAuthConsentChallengeResult =
  | { ok: true; record: OAuthConsentChallengeRecord }
  | { error: "not_found" | "already_used" | "expired" | "platform_user_mismatch"; ok: false };

export interface OAuthConsentChallengeRepository {
  consume(input: ConsumeOAuthConsentChallengeInput): Promise<ConsumeOAuthConsentChallengeResult>;
  issue(input: IssueOAuthConsentChallengeInput): Promise<OAuthConsentChallengeRecord>;
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
    throw new Error("PostgreSQL settings are not configured for NOF Platform OAuth consent challenges");
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
}

function schemaName(): string {
  return process.env.NOF_PLATFORM_DB_SCHEMA ?? "nof_platform";
}

function safeSqlIdentifier(identifier: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error("Invalid SQL identifier for NOF Platform OAuth consent challenges");
  }
  return identifier;
}

function nowIso(now: Date): string {
  return now.toISOString();
}

function expirationIso(now: Date, ttlSeconds: number): string {
  return new Date(now.getTime() + ttlSeconds * 1000).toISOString();
}

function generateChallengeId(): string {
  return `oauth_consent_${randomUUID().replaceAll("-", "")}`;
}

function consumeRecord(
  record: OAuthConsentChallengeRecord | undefined,
  input: ConsumeOAuthConsentChallengeInput,
  now: Date,
): ConsumeOAuthConsentChallengeResult {
  if (!record) {
    return { error: "not_found", ok: false };
  }
  if (record.usedAt) {
    return { error: "already_used", ok: false };
  }
  if (record.platformUserId !== input.platformUserId) {
    return { error: "platform_user_mismatch", ok: false };
  }
  if (Date.parse(record.expiresAt) <= now.getTime()) {
    return { error: "expired", ok: false };
  }

  return { ok: true, record: { ...record, usedAt: nowIso(now) } };
}

export class InMemoryOAuthConsentChallengeRepository implements OAuthConsentChallengeRepository {
  private readonly records = new Map<string, OAuthConsentChallengeRecord>();

  constructor(private readonly now: () => Date = () => new Date()) {}

  async issue(input: IssueOAuthConsentChallengeInput): Promise<OAuthConsentChallengeRecord> {
    const record: OAuthConsentChallengeRecord = {
      ...input,
      challengeId: generateChallengeId(),
      expiresAt: expirationIso(this.now(), input.ttlSeconds),
    };
    this.records.set(record.challengeId, record);
    return record;
  }

  async consume(input: ConsumeOAuthConsentChallengeInput): Promise<ConsumeOAuthConsentChallengeResult> {
    const result = consumeRecord(this.records.get(input.challengeId), input, this.now());
    if (result.ok) {
      this.records.set(input.challengeId, result.record);
    }
    return result;
  }

  importRecord(record: OAuthConsentChallengeRecord): void {
    this.records.set(record.challengeId, record);
  }
}

interface OAuthConsentChallengeRow extends QueryResultRow {
  challenge_id: string;
  client_id: string;
  expires_at: Date | string;
  nonce: string;
  platform_user_id: string;
  redirect_uri: string;
  scopes: string[];
  state: string;
  used_at: Date | string | null;
}

function rowToRecord(row: OAuthConsentChallengeRow): OAuthConsentChallengeRecord {
  const usedAt = row.used_at instanceof Date ? row.used_at.toISOString() : row.used_at;
  const expiresAt = row.expires_at instanceof Date ? row.expires_at.toISOString() : row.expires_at;
  return {
    challengeId: row.challenge_id,
    clientId: row.client_id,
    expiresAt,
    nonce: row.nonce,
    platformUserId: row.platform_user_id,
    redirectUri: row.redirect_uri,
    scopes: row.scopes,
    state: row.state,
    ...(usedAt ? { usedAt } : {}),
  };
}

export class PostgresOAuthConsentChallengeRepository implements OAuthConsentChallengeRepository {
  private initialized = false;
  private readonly schema: string;

  constructor(
    private readonly pool: OAuthConsentChallengePool = new Pool({ connectionString: databaseUrl(), max: 3 }),
    schema = schemaName(),
    private readonly now: () => Date = () => new Date(),
  ) {
    this.schema = safeSqlIdentifier(schema);
  }

  async issue(input: IssueOAuthConsentChallengeInput): Promise<OAuthConsentChallengeRecord> {
    await this.initialize();
    const record: OAuthConsentChallengeRecord = {
      ...input,
      challengeId: generateChallengeId(),
      expiresAt: expirationIso(this.now(), input.ttlSeconds),
    };

    await this.pool.query(
      `INSERT INTO ${this.schema}.oauth_consent_challenges
       (challenge_id, client_id, platform_user_id, redirect_uri, scopes, state, nonce, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        record.challengeId,
        record.clientId,
        record.platformUserId,
        record.redirectUri,
        record.scopes,
        record.state,
        record.nonce,
        record.expiresAt,
      ],
    );

    return record;
  }

  async consume(input: ConsumeOAuthConsentChallengeInput): Promise<ConsumeOAuthConsentChallengeResult> {
    await this.initialize();
    const result = await this.pool.query<OAuthConsentChallengeRow>(
      `SELECT challenge_id, client_id, platform_user_id, redirect_uri, scopes, state, nonce, expires_at, used_at
       FROM ${this.schema}.oauth_consent_challenges
       WHERE challenge_id = $1
       LIMIT 1`,
      [input.challengeId],
    );

    const consumeResult = consumeRecord(result.rows[0] ? rowToRecord(result.rows[0]) : undefined, input, this.now());
    if (consumeResult.ok) {
      const updateResult = await this.pool.query<OAuthConsentChallengeRow>(
        `UPDATE ${this.schema}.oauth_consent_challenges
         SET used_at = $1
         WHERE challenge_id = $2 AND used_at IS NULL
         RETURNING challenge_id, client_id, platform_user_id, redirect_uri, scopes, state, nonce, expires_at, used_at`,
        [consumeResult.record.usedAt, input.challengeId],
      );
      if (!updateResult.rows[0]) {
        return { error: "already_used", ok: false };
      }
      return { ok: true, record: rowToRecord(updateResult.rows[0]) };
    }

    return consumeResult;
  }

  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS ${this.schema}`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.schema}.oauth_consent_challenges (
        challenge_id TEXT PRIMARY KEY,
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

let repository: OAuthConsentChallengeRepository | undefined;

export function getOAuthConsentChallengeRepository(): OAuthConsentChallengeRepository {
  repository ??= new PostgresOAuthConsentChallengeRepository();
  return repository;
}
