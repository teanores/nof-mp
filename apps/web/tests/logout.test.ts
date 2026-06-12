import { describe, expect, it } from "vitest";

import { buildPortalLogoutResponse } from "@/lib/server/logout";

describe("portal logout", () => {
  it("clears host and legacy domain variants of the shared auth cookie", () => {
    const response = buildPortalLogoutResponse();

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/login");

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("auth_token=");
    expect(setCookie.match(/Max-Age=0/g)).toHaveLength(3);
    expect(setCookie.match(/Path=\//g)).toHaveLength(3);
    expect(setCookie).toContain("Domain=forgath.ru");
    expect(setCookie).toContain("Domain=.forgath.ru");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=lax");
  });
});
