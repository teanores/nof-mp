import { Pool, type QueryResultRow } from "pg";

import { platformDatabaseUrl } from "@/lib/server/platform-database-config";

export interface PlatformProfileUpdateInput {
  aboutMe?: string;
  userId: string;
  username: string;
}

interface PlatformProfileRow extends QueryResultRow {
  about_me: string | null;
  id: string;
  username: string;
}

export type PlatformProfileUpdateResult =
  | { ok: true; profile: { aboutMe?: string; id: string; username: string } }
  | { ok: false; reason: "invalid_username" | "not_found" };

function normalizeUsername(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeAboutMe(value?: string): string | null {
  const normalized = value?.trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, 280) : null;
}

export class PlatformProfileRepository {
  private readonly pool: Pool;

  constructor(pool = new Pool({ connectionString: platformDatabaseUrl("NOF Platform profile"), max: 3 })) {
    this.pool = pool;
  }

  async updateOwnProfile(input: PlatformProfileUpdateInput): Promise<PlatformProfileUpdateResult> {
    const username = normalizeUsername(input.username);
    if (username.length < 2 || username.length > 64) {
      return { ok: false, reason: "invalid_username" };
    }

    const result = await this.pool.query<PlatformProfileRow>(
      `UPDATE dragon_forge."user"
       SET username = $2,
           about_me = $3
       WHERE id = $1::uuid
       RETURNING id::text, username, about_me`,
      [input.userId, username, normalizeAboutMe(input.aboutMe)],
    );
    const row = result.rows[0];
    if (!row) {
      return { ok: false, reason: "not_found" };
    }

    return {
      ok: true,
      profile: {
        id: row.id,
        username: row.username,
        ...(row.about_me ? { aboutMe: row.about_me } : {}),
      },
    };
  }
}

let repository: PlatformProfileRepository | undefined;

export function getPlatformProfileRepository(): PlatformProfileRepository {
  repository ??= new PlatformProfileRepository();
  return repository;
}
