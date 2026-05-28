import { describe, expect, it } from "vitest";

import { listPlatformProjects, platformProjectRecords, projectExists } from "@/lib/platform-projects";

describe("platform project registry", () => {
  it("keeps registered products closed to guests but visible with access reasons", () => {
    const projects = listPlatformProjects({ role: "guest" });
    const taskTracker = projects.find((project) => project.key === "nof-tt");

    expect(taskTracker).toMatchObject({
      visibility: "registered",
      access: { allowed: false, reason: "authentication-required" },
    });
  });

  it("allows authenticated users to open registered products", () => {
    const projects = listPlatformProjects({ role: "user", userId: "u-1" });
    const taskTracker = projects.find((project) => project.key === "nof-tt");

    expect(taskTracker).toMatchObject({ access: { allowed: true, reason: "registered-user" } });
  });

  it("keeps public products available to guests", () => {
    const coffeeBot = listPlatformProjects({ role: "guest" }).find((project) => project.key === "nof-cb");

    expect(coffeeBot).toMatchObject({ visibility: "public", access: { allowed: true, reason: "public-product" } });
  });

  it("stores the Russian learning portal name as UTF-8", () => {
    expect(platformProjectRecords.find((project) => project.key === "nof-onw")?.name).toBe("Орден Нейронного Пути");
  });

  it("checks project existence against records, not access-decorated DTOs", () => {
    expect(projectExists("nof-ht")).toBe(true);
    expect(projectExists("unknown-product")).toBe(false);
  });
});
