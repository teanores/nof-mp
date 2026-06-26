import crypto from "node:crypto";

import { Pool, type QueryResultRow } from "pg";

import { normalizePlatformEmail } from "@/lib/server/email-address-policy";
import { platformDatabaseUrl } from "@/lib/server/platform-database-config";

export type CanonicalIdentityAliasKind =
  | "email"
  | "telegram_id"
  | "telegram_username"
  | "platform_user_id"
  | "nof_ht_user_id"
  | "nof_tt_user_id"
  | "messenger_id";

export type CanonicalIdentityVerificationState = "denied" | "service_placeholder" | "unverified" | "verified";

export interface ClaimCanonicalAliasInput {
  actorUserId?: string;
  aliasKind: CanonicalIdentityAliasKind;
  aliasProvider?: string;
  aliasValue: string | number;
  personId?: string;
  platformUserId?: string;
  verificationState?: CanonicalIdentityVerificationState;
}

export type ClaimCanonicalAliasResult =
  | { aliasId: string; ok: true; personId: string }
  | { ok: false; reason: "alias_conflict" | "invalid_alias" | "invalid_person" };

interface ExistingAliasRow extends QueryResultRow {
  id: string;
  person_id: string;
}

interface PersonRow extends QueryResultRow {
  id: string;
}

function normalizeAliasProvider(value?: string): string {
  return value?.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "nof";
}

export function normalizeCanonicalAliasValue(kind: CanonicalIdentityAliasKind, value: string | number): string {
  const raw = String(value).trim();
  if (!raw) {
    return "";
  }

  if (kind === "email") {
    return normalizePlatformEmail(raw);
  }
  if (kind === "telegram_username") {
    return raw.replace(/^@+/, "").toLowerCase();
  }
  if (kind === "telegram_id") {
    return /^\d+$/.test(raw) ? raw : "";
  }
  if (kind.endsWith("_user_id") || kind === "platform_user_id") {
    return raw.toLowerCase();
  }

  return raw.toLowerCase();
}

export function canonicalAliasHash(kind: CanonicalIdentityAliasKind, provider: string, normalizedValue: string): string {
  return crypto.createHash("sha256").update(`${kind}:${provider}:${normalizedValue}`, "utf8").digest("hex");
}

export function canonicalAliasDisplayValue(kind: CanonicalIdentityAliasKind, normalizedValue: string): string | null {
  if (kind === "email" || kind === "telegram_username") {
    return normalizedValue;
  }
  return null;
}

export class CanonicalIdentityRepository {
  private readonly pool: Pool;

  constructor(pool = new Pool({ connectionString: platformDatabaseUrl("NOF Platform canonical identity"), max: 3 })) {
    this.pool = pool;
  }

  async claimAlias(input: ClaimCanonicalAliasInput): Promise<ClaimCanonicalAliasResult> {
    await this.ensureSchema();

    const provider = normalizeAliasProvider(input.aliasProvider);
    const normalizedValue = normalizeCanonicalAliasValue(input.aliasKind, input.aliasValue);
    if (!normalizedValue) {
      return { ok: false, reason: "invalid_alias" };
    }

    const aliasHash = canonicalAliasHash(input.aliasKind, provider, normalizedValue);
    const existingAlias = await this.pool.query<ExistingAliasRow>(
      `SELECT id::text AS id, person_id::text AS person_id
       FROM nof_platform.identity_alias
       WHERE alias_kind = $1
         AND alias_provider = $2
         AND alias_value_hash = $3
         AND revoked_at IS NULL
       LIMIT 1`,
      [input.aliasKind, provider, aliasHash],
    );
    const existing = existingAlias.rows[0];
    if (existing) {
      if (!input.personId || existing.person_id === input.personId) {
        return { aliasId: existing.id, ok: true, personId: existing.person_id };
      }
      return { ok: false, reason: "alias_conflict" };
    }

    const personId = input.personId ?? crypto.randomUUID();
    if (input.personId) {
      const person = await this.pool.query<PersonRow>(
        `SELECT id::text AS id
         FROM nof_platform.canonical_person
         WHERE id = $1::uuid
           AND lifecycle_status = 'active'
         LIMIT 1`,
        [input.personId],
      );
      if (!person.rows[0]) {
        return { ok: false, reason: "invalid_person" };
      }
    }

    const aliasId = crypto.randomUUID();
    await this.pool.query("BEGIN");
    try {
      if (!input.personId) {
        await this.pool.query(
          `INSERT INTO nof_platform.canonical_person (id, created_by, updated_by)
           VALUES ($1::uuid, $2::uuid, $2::uuid)`,
          [personId, input.actorUserId ?? null],
        );
      }
      await this.pool.query(
        `INSERT INTO nof_platform.identity_alias
          (id, person_id, alias_kind, alias_provider, alias_value_hash, display_value, verification_state, verified_at, created_by)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, CASE WHEN $7 = 'verified' THEN NOW() ELSE NULL END, $8::uuid)`,
        [
          aliasId,
          personId,
          input.aliasKind,
          provider,
          aliasHash,
          canonicalAliasDisplayValue(input.aliasKind, normalizedValue),
          input.verificationState ?? "unverified",
          input.actorUserId ?? null,
        ],
      );
      await this.pool.query(
        `INSERT INTO nof_platform.identity_alias_event (alias_id, person_id, event_type, actor_user_id, reason)
         VALUES ($1::uuid, $2::uuid, 'claim', $3::uuid, $4)`,
        [aliasId, personId, input.actorUserId ?? null, `claim:${input.aliasKind}:${provider}`],
      );
      if (input.platformUserId) {
        await this.pool.query(
          `INSERT INTO nof_platform.person_account_link (person_id, platform_user_id, linked_by)
           VALUES ($1::uuid, $2::uuid, $3::uuid)
           ON CONFLICT (person_id, platform_user_id) DO UPDATE SET
             link_state = 'active',
             linked_at = NOW(),
             linked_by = EXCLUDED.linked_by`,
          [personId, input.platformUserId, input.actorUserId ?? null],
        );
      }
      await this.pool.query("COMMIT");
    } catch (error) {
      await this.pool.query("ROLLBACK");
      throw error;
    }

    return { aliasId, ok: true, personId };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private async ensureSchema(): Promise<void> {
    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS nof_platform`);
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS nof_platform.canonical_person (
        id uuid PRIMARY KEY,
        lifecycle_status text NOT NULL DEFAULT 'active'
          CHECK (lifecycle_status IN ('active', 'denied', 'merged', 'archived')),
        created_at timestamptz NOT NULL DEFAULT now(),
        created_by uuid,
        updated_at timestamptz NOT NULL DEFAULT now(),
        updated_by uuid
      )`,
    );
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS nof_platform.identity_alias (
        id uuid PRIMARY KEY,
        person_id uuid NOT NULL REFERENCES nof_platform.canonical_person (id),
        alias_kind text NOT NULL
          CHECK (alias_kind IN ('email', 'telegram_id', 'telegram_username', 'platform_user_id', 'nof_ht_user_id', 'nof_tt_user_id', 'messenger_id')),
        alias_provider text NOT NULL DEFAULT 'nof',
        alias_value_hash text NOT NULL,
        display_value text,
        verification_state text NOT NULL DEFAULT 'unverified'
          CHECK (verification_state IN ('unverified', 'verified', 'service_placeholder', 'denied')),
        claimed_at timestamptz NOT NULL DEFAULT now(),
        verified_at timestamptz,
        revoked_at timestamptz,
        created_by uuid,
        CHECK (alias_value_hash <> ''),
        CHECK (display_value IS NULL OR length(display_value) <= 320)
      )`,
    );
    await this.pool.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS identity_alias_active_unique_idx
       ON nof_platform.identity_alias (alias_kind, alias_provider, alias_value_hash)
       WHERE revoked_at IS NULL`,
    );
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS nof_platform.identity_alias_event (
        id bigserial PRIMARY KEY,
        alias_id uuid REFERENCES nof_platform.identity_alias (id),
        person_id uuid REFERENCES nof_platform.canonical_person (id),
        event_type text NOT NULL
          CHECK (event_type IN ('claim', 'verify', 'link', 'unlink', 'supersede', 'deny')),
        actor_user_id uuid,
        reason text,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
    );
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS nof_platform.person_account_link (
        person_id uuid NOT NULL REFERENCES nof_platform.canonical_person (id),
        platform_user_id uuid NOT NULL,
        link_state text NOT NULL DEFAULT 'active'
          CHECK (link_state IN ('active', 'denied', 'superseded', 'archived')),
        linked_at timestamptz NOT NULL DEFAULT now(),
        linked_by uuid,
        PRIMARY KEY (person_id, platform_user_id)
      )`,
    );
    await this.pool.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS person_account_link_active_user_idx
       ON nof_platform.person_account_link (platform_user_id)
       WHERE link_state = 'active'`,
    );
  }
}

let repository: CanonicalIdentityRepository | undefined;

export function getCanonicalIdentityRepository(): CanonicalIdentityRepository {
  repository ??= new CanonicalIdentityRepository();
  return repository;
}
