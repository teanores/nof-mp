import { describe, expect, it } from "vitest";

import { buildPortalLogoutResponse } from "@/lib/server/logout";

describe("portal logout", () => {
  it("clears the shared Dragon Forge auth cookie and redirects to login", () => {
    const response = buildPortalLogoutResponse();

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/login");

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("auth_token=");
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=lax");
  });
});
