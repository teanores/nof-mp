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

  it("returns projects sorted by key for stable selectors", () => {
    const keys = listPlatformProjects({ role: "user", userId: "u-1" }).map((project) => project.key);

    expect(keys).toEqual([...keys].sort((first, second) => first.localeCompare(second, "en")));
  });

  it("allows authenticated users to open registered products", () => {
    const projects = listPlatformProjects({ role: "user", userId: "u-1" });
    const taskTracker = projects.find((project) => project.key === "nof-tt");

    expect(taskTracker).toMatchObject({ access: { allowed: true, reason: "registered-user" } });
  });

  it("keeps partner products closed to guests and available to partners", () => {
    const coffeeBot = listPlatformProjects({ role: "guest" }).find((project) => project.key === "nof-cb");
    const partnerCoffeeBot = listPlatformProjects({ role: "partner", userId: "u-partner" }).find((project) => project.key === "nof-cb");

    expect(coffeeBot).toMatchObject({ visibility: "invited", access: { allowed: false, reason: "authentication-required" } });
    expect(partnerCoffeeBot).toMatchObject({ visibility: "invited", access: { allowed: true, reason: "role-granted" } });
  });

  it("stores the Russian learning portal name as UTF-8", () => {
    expect(platformProjectRecords.find((project) => project.key === "nof-onw")?.name).toBe("Орден Нейронного Пути");
  });

  it("keeps platform product descriptions in Russian for the Russian portal", () => {
    const registryText = JSON.stringify(platformProjectRecords);

    expect(platformProjectRecords.find((project) => project.key === "nof-tt")?.description).toContain("Трекер задач");
    expect(platformProjectRecords.find((project) => project.key === "nof-ht")?.description).toContain("Трекер привычек");
    expect(platformProjectRecords.find((project) => project.key === "nof-cb")?.description).toContain("Самостоятельный сервис");
    expect(registryText).not.toContain("Task tracker");
    expect(registryText).not.toContain("Habit tracker");
    expect(registryText).not.toContain("Standalone coffee ordering");
  });

  it("checks project existence against records, not access-decorated DTOs", () => {
    expect(projectExists("nof-ht")).toBe(true);
    expect(projectExists("unknown-product")).toBe(false);
  });
});
