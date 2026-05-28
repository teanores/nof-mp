import { describe, expect, it } from "vitest";

import { legacyLoginUrl, portalLoginUrl, safePortalReturnTo } from "@/lib/server/portal-auth-gate";

describe("portal auth gate urls", () => {
  it("keeps protected page redirects on the current portal origin", () => {
    expect(portalLoginUrl("/tasks")).toBe("/login?next=%2Ftasks");
  });

  it("keeps query params when redirecting back after login", () => {
    expect(portalLoginUrl("/tasks?status=todo&project=nof-tt")).toBe(
      "/login?next=%2Ftasks%3Fstatus%3Dtodo%26project%3Dnof-tt",
    );
  });

  it("falls back to the portal root for unsafe return targets", () => {
    expect(safePortalReturnTo("https://evil.example/tasks")).toBe("/");
    expect(safePortalReturnTo("//evil.example/tasks")).toBe("/");
    expect(safePortalReturnTo("tasks")).toBe("/");
  });

  it("does not redirect back to the login page", () => {
    expect(safePortalReturnTo("/login?next=/tasks")).toBe("/");
    expect(portalLoginUrl("/login?next=/tasks")).toBe("/login?next=%2F");
  });

  it("preserves the requested page when linking to legacy Dragon Forge auth", () => {
    expect(legacyLoginUrl("http://192.168.1.51:30500/login", "/tasks")).toBe("http://192.168.1.51:30500/login?next=%2Ftasks");
  });

  it("sanitizes return targets when linking to legacy Dragon Forge auth", () => {
    expect(legacyLoginUrl("http://192.168.1.51:30500/login", "//evil.example/tasks")).toBe(
      "http://192.168.1.51:30500/login?next=%2F",
    );
  });
});
