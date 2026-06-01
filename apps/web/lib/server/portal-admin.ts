import { notFound } from "next/navigation";

import type { ForgePortalSession } from "@/lib/types";

const adminRoles = new Set(["owner", "admin"]);

export function isPortalAdminSession(session: ForgePortalSession): boolean {
  return Boolean(session.authenticated && session.user?.role?.name && adminRoles.has(session.user.role.name));
}

export function requirePortalAdminSession(session: ForgePortalSession): void {
  if (!isPortalAdminSession(session)) {
    notFound();
  }
}
