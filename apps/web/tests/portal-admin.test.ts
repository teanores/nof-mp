import { describe, expect, it } from "vitest";

import { isPortalAdminSession } from "@/lib/server/portal-admin";
import type { ForgePortalSession } from "@/lib/types";

function sessionWithRole(role?: string): ForgePortalSession {
  return {
    authenticated: Boolean(role),
    loginUrl: "/login",
    user: role
      ? {
          experience: 0,
          id: "u-1",
          role: { id: 1, name: role },
          username: "teanore",
        }
      : undefined,
  };
}

describe("portal admin guard", () => {
  it("allows owner and admin roles", () => {
    expect(isPortalAdminSession(sessionWithRole("owner"))).toBe(true);
    expect(isPortalAdminSession(sessionWithRole("admin"))).toBe(true);
  });

  it("rejects regular users and guests", () => {
    expect(isPortalAdminSession(sessionWithRole("user"))).toBe(false);
    expect(isPortalAdminSession(sessionWithRole())).toBe(false);
  });
});
