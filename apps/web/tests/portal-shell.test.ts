import { describe, expect, it } from "vitest";

import { portalModules, portalModuleStatusLabel, protectedPortalRoutes, systemHealthCards } from "@/lib/portal-shell";

describe("platform shell manifest", () => {
  it("keeps the canonical platform modules visible", () => {
    expect(portalModules.map((module) => module.key)).toEqual([
      "tracker",
      "habits",
      "ideas",
      "wiki",
      "references",
      "bots",
      "legacy",
      "profile",
    ]);
  });

  it("keeps platform-owned routes behind the auth gate during preview", () => {
    expect(protectedPortalRoutes).toContain("/overview");
    expect(protectedPortalRoutes).toContain("/profile");
  });

  it("links products through platform modules instead of embedding product boards", () => {
    expect(portalModules.find((module) => module.key === "tracker")?.href).toBe("/projects");
    expect(portalModules.find((module) => module.key === "habits")?.href).toBe("/projects/nof-ht");
  });

  it("documents canonical and preview addresses for the cutover path", () => {
    expect(systemHealthCards).toContainEqual({
      label: "Canonical",
      note: "gateway target",
      value: "192.168.1.51:30500",
    });
  });

  it("renders stable status labels", () => {
    expect(portalModuleStatusLabel("available")).toBe("available");
    expect(portalModuleStatusLabel("legacy")).toBe("legacy");
    expect(portalModuleStatusLabel("planned")).toBe("planned");
    expect(portalModuleStatusLabel("preview")).toBe("preview");
  });
});
