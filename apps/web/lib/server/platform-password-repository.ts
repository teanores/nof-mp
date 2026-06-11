import { Pool, type QueryResultRow } from "pg";

import { platformDatabaseUrl } from "@/lib/server/platform-database-config";
import { hashPlatformPassword, platformPasswordPolicyErrors, verifyPlatformPassword, type PlatformPasswordPolicyError } from "@/lib/server/platform-password";

interface PlatformPasswordUserRow extends QueryResultRow {
  email: string | null;
  password_hash: string | null;
  username: string;
}

export type ChangePlatformPasswordResult =
  | { ok: true }
  | { errors?: PlatformPasswordPolicyError[]; ok: false; reason: "invalid_current_password" | "password_policy" | "password_unavailable" | "password_unchanged" | "user_not_found" };

export class PlatformPasswordRepository {
  private readonly pool: Pool;

  constructor(pool = new Pool({ connectionString: platformDatabaseUrl("Platform password management"), max: 3 })) {
    this.pool = pool;
  }

  async changePassword(input: { currentPassword: string; newPassword: string; userId: string }): Promise<ChangePlatformPasswordResult> {
    const result = await this.pool.query<PlatformPasswordUserRow>(
      `SELECT username, email, password_hash
       FROM dragon_forge."user"
       WHERE id = $1::uuid
       LIMIT 1`,
      [input.userId],
    );

    const user = result.rows[0];
    if (!user) return { ok: false, reason: "user_not_found" };
    if (!user.password_hash) return { ok: false, reason: "password_unavailable" };
    if (!verifyPlatformPassword(input.currentPassword, user.password_hash)) return { ok: false, reason: "invalid_current_password" };
    if (input.currentPassword === input.newPassword) return { ok: false, reason: "password_unchanged" };

    const errors = platformPasswordPolicyErrors(input.newPassword, { email: user.email, username: user.username });
    if (errors.length > 0) return { errors, ok: false, reason: "password_policy" };

    await this.pool.query(
      `UPDATE dragon_forge."user"
       SET password_hash = $1
       WHERE id = $2::uuid`,
      [hashPlatformPassword(input.newPassword), input.userId],
    );

    return { ok: true };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

let repository: PlatformPasswordRepository | undefined;

export function getPlatformPasswordRepository(): PlatformPasswordRepository {
  repository ??= new PlatformPasswordRepository();
  return repository;
}
