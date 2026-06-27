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

export interface ClaimCanonicalAliasBatchInput {
  actorUserId?: string;
  aliases: Array<Omit<ClaimCanonicalAliasInput, "actorUserId" | "personId" | "platformUserId">>;
  personId?: string;
  platformUserId: string;
}

export interface ReconcilePlatformIdentityInput {
  actorUserId?: string;
  canonicalPlatformUserId: string;
  users: ClaimCanonicalAliasBatchInput[];
}

export interface UnlinkPlatformIdentityInput {
  actorUserId?: string;
  personId: string;
  platformUserId: string;
}

export type ClaimCanonicalAliasResult =
  | { aliasId: string; ok: true; personId: string }
  | { ok: false; reason: "alias_conflict" | "invalid_alias" | "invalid_person" };

export type ClaimCanonicalAliasBatchResult =
  | { aliasIds: string[]; ok: true; personId: string }
  | { ok: false; reason: "alias_conflict" | "invalid_alias" };

export type ReconcilePlatformIdentityResult =
  | { linkedUserIds: string[]; ok: true; personId: string }
  | { ok: false; reason: "alias_conflict" | "canonical_user_required" | "invalid_alias" | "too_few_users" };

export type UnlinkPlatformIdentityResult =
  | { ok: true; personId: string; platformUserId: string }
  | { ok: false; reason: "link_not_found" };

interface ExistingAliasRow extends QueryResultRow {
  alias_kind: CanonicalIdentityAliasKind;
  alias_provider: string;
  alias_value_hash: string;
  id: string;
  person_id: string;
}

interface PersonRow extends QueryResultRow {
  id: string;
}

interface NormalizedAliasClaim {
  aliasHash: string;
  displayValue: string | null;
  kind: CanonicalIdentityAliasKind;
  provider: string;
  verificationState: CanonicalIdentityVerificationState;
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

  async claimAliasesForPlatformUser(input: ClaimCanonicalAliasBatchInput): Promise<ClaimCanonicalAliasBatchResult> {
    await this.ensureSchema();

    const normalizedAliases = [
      {
        aliasKind: "platform_user_id" as const,
        aliasProvider: "nof",
        aliasValue: input.platformUserId,
        verificationState: "verified" as const,
      },
      ...input.aliases,
    ].map((alias): NormalizedAliasClaim | undefined => {
      const provider = normalizeAliasProvider(alias.aliasProvider);
      const normalizedValue = normalizeCanonicalAliasValue(alias.aliasKind, alias.aliasValue);
      if (!normalizedValue) {
        return undefined;
      }
      return {
        aliasHash: canonicalAliasHash(alias.aliasKind, provider, normalizedValue),
        displayValue: canonicalAliasDisplayValue(alias.aliasKind, normalizedValue),
        kind: alias.aliasKind,
        provider,
        verificationState: alias.verificationState ?? "unverified",
      };
    });

    if (normalizedAliases.some((alias) => !alias)) {
      return { ok: false, reason: "invalid_alias" };
    }

    const aliases = normalizedAliases as NormalizedAliasClaim[];
    const conditions = aliases
      .map((_, index) => {
        const offset = index * 3;
        return `(alias_kind = $${offset + 1} AND alias_provider = $${offset + 2} AND alias_value_hash = $${offset + 3})`;
      })
      .join(" OR ");
    const values = aliases.flatMap((alias) => [alias.kind, alias.provider, alias.aliasHash]);
    const existingResult = await this.pool.query<ExistingAliasRow>(
      `SELECT id::text AS id, person_id::text AS person_id, alias_kind, alias_provider, alias_value_hash
       FROM nof_platform.identity_alias
       WHERE revoked_at IS NULL
         AND (${conditions})`,
      values,
    );
    const personIds = new Set(existingResult.rows.map((row) => row.person_id));
    if (personIds.size > 1) {
      return { ok: false, reason: "alias_conflict" };
    }

    if (input.personId && personIds.size === 1 && !personIds.has(input.personId)) {
      return { ok: false, reason: "alias_conflict" };
    }

    const personId = input.personId ?? existingResult.rows[0]?.person_id ?? crypto.randomUUID();
    const existingByKey = new Map(existingResult.rows.map((row) => [`${row.alias_kind}:${row.alias_provider}:${row.alias_value_hash}`, row]));
    const aliasIds: string[] = [];

    await this.pool.query("BEGIN");
    try {
      if (existingResult.rows.length === 0) {
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
            await this.pool.query("ROLLBACK");
            return { ok: false, reason: "alias_conflict" };
          }
        } else {
          await this.pool.query(
            `INSERT INTO nof_platform.canonical_person (id, created_by, updated_by)
             VALUES ($1::uuid, $2::uuid, $2::uuid)`,
            [personId, input.actorUserId ?? null],
          );
        }
      }

      for (const alias of aliases) {
        const existing = existingByKey.get(`${alias.kind}:${alias.provider}:${alias.aliasHash}`);
        if (existing) {
          aliasIds.push(existing.id);
          continue;
        }

        const aliasId = crypto.randomUUID();
        aliasIds.push(aliasId);
        await this.pool.query(
          `INSERT INTO nof_platform.identity_alias
            (id, person_id, alias_kind, alias_provider, alias_value_hash, display_value, verification_state, verified_at, created_by)
           VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, CASE WHEN $7 = 'verified' THEN NOW() ELSE NULL END, $8::uuid)`,
          [aliasId, personId, alias.kind, alias.provider, alias.aliasHash, alias.displayValue, alias.verificationState, input.actorUserId ?? null],
        );
        await this.pool.query(
          `INSERT INTO nof_platform.identity_alias_event (alias_id, person_id, event_type, actor_user_id, reason)
           VALUES ($1::uuid, $2::uuid, 'claim', $3::uuid, $4)`,
          [aliasId, personId, input.actorUserId ?? null, `claim:${alias.kind}:${alias.provider}`],
        );
      }

      await this.pool.query(
        `INSERT INTO nof_platform.person_account_link (person_id, platform_user_id, linked_by)
         VALUES ($1::uuid, $2::uuid, $3::uuid)
         ON CONFLICT (person_id, platform_user_id) DO UPDATE SET
           link_state = 'active',
           linked_at = NOW(),
           linked_by = EXCLUDED.linked_by`,
        [personId, input.platformUserId, input.actorUserId ?? null],
      );
      await this.pool.query(
        `INSERT INTO nof_platform.identity_alias_event (alias_id, person_id, event_type, actor_user_id, reason)
         VALUES (NULL, $1::uuid, 'link', $2::uuid, $3)`,
        [personId, input.actorUserId ?? null, `link:platform_user:${input.platformUserId}`],
      );
      await this.pool.query("COMMIT");
    } catch (error) {
      await this.pool.query("ROLLBACK");
      throw error;
    }

    return { aliasIds, ok: true, personId };
  }

  async reconcilePlatformUsers(input: ReconcilePlatformIdentityInput): Promise<ReconcilePlatformIdentityResult> {
    const uniqueUsers = new Map(input.users.map((user) => [user.platformUserId, { ...user, actorUserId: input.actorUserId }]));
    if (!input.canonicalPlatformUserId || !uniqueUsers.has(input.canonicalPlatformUserId)) {
      return { ok: false, reason: "canonical_user_required" };
    }
    if (uniqueUsers.size < 2) {
      return { ok: false, reason: "too_few_users" };
    }

    const canonical = uniqueUsers.get(input.canonicalPlatformUserId);
    if (!canonical) {
      return { ok: false, reason: "canonical_user_required" };
    }

    const canonicalResult = await this.claimAliasesForPlatformUser(canonical);
    if (!canonicalResult.ok) {
      return canonicalResult;
    }

    const linkedUserIds = [input.canonicalPlatformUserId];
    for (const user of uniqueUsers.values()) {
      if (user.platformUserId === input.canonicalPlatformUserId) {
        continue;
      }
      const result = await this.claimAliasesForPlatformUser({
        ...user,
        actorUserId: input.actorUserId,
        personId: canonicalResult.personId,
      });
      if (!result.ok) {
        return result;
      }
      linkedUserIds.push(user.platformUserId);
    }

    return { linkedUserIds, ok: true, personId: canonicalResult.personId };
  }

  async listLinkedPlatformUserIds(platformUserId: string): Promise<{ personId: string; platformUserIds: string[] } | null> {
    await this.ensureSchema();
    const person = await this.pool.query<{ person_id: string }>(
      `SELECT person_id::text AS person_id
       FROM nof_platform.person_account_link
       WHERE platform_user_id = $1::uuid
         AND link_state = 'active'
       LIMIT 1`,
      [platformUserId],
    );
    const personId = person.rows[0]?.person_id;
    if (!personId) {
      return null;
    }

    const links = await this.pool.query<{ platform_user_id: string }>(
      `SELECT platform_user_id::text AS platform_user_id
       FROM nof_platform.person_account_link
       WHERE person_id = $1::uuid
         AND link_state = 'active'
       ORDER BY linked_at ASC`,
      [personId],
    );
    return { personId, platformUserIds: links.rows.map((row) => row.platform_user_id) };
  }

  async unlinkPlatformUser(input: UnlinkPlatformIdentityInput): Promise<UnlinkPlatformIdentityResult> {
    await this.ensureSchema();
    const result = await this.pool.query<{ person_id: string }>(
      `UPDATE nof_platform.person_account_link
       SET link_state = 'archived',
           linked_at = NOW(),
           linked_by = $3::uuid
       WHERE person_id = $1::uuid
         AND platform_user_id = $2::uuid
         AND link_state = 'active'
       RETURNING person_id::text AS person_id`,
      [input.personId, input.platformUserId, input.actorUserId ?? null],
    );
    if (!result.rows[0]) {
      return { ok: false, reason: "link_not_found" };
    }
    await this.pool.query(
      `INSERT INTO nof_platform.identity_alias_event (alias_id, person_id, event_type, actor_user_id, reason)
       VALUES (NULL, $1::uuid, 'unlink', $2::uuid, $3)`,
      [input.personId, input.actorUserId ?? null, `unlink:platform_user:${input.platformUserId}`],
    );
    return { ok: true, personId: input.personId, platformUserId: input.platformUserId };
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
