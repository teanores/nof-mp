import { describe, expect, it } from "vitest";

import { portalModules, portalModuleStatusLabel, protectedPortalRoutes, systemHealthCards } from "@/lib/portal-shell";

describe("platform shell manifest", () => {
  it("keeps only platform-level service cards visible", () => {
    expect(portalModules.map((module) => module.key)).toEqual(["tracker", "habits", "streamer"]);
  });

  it("keeps platform-owned routes behind the auth gate during preview", () => {
    expect(protectedPortalRoutes).toContain("/overview");
    expect(protectedPortalRoutes).toContain("/profile");
  });

  it("opens service preview pages instead of product internals", () => {
    expect(portalModules.find((module) => module.key === "tracker")?.href).toBe("/services/task-tracker");
    expect(portalModules.find((module) => module.key === "habits")?.href).toBe("/services/habit-tracker");
    expect(portalModules.find((module) => module.key === "streamer")?.href).toBe("/services/streamer");
    expect(portalModules.map((module) => module.href)).not.toContain("/ideas");
    expect(portalModules.map((module) => module.href)).not.toContain("/projects/nof-ht");
    expect(portalModules.map((module) => module.href)).not.toContain("/products/nof-tt/launch?next=/projects/nof-tt");
  });

  it("documents canonical address for the cutover path", () => {
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
