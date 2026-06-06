import { describe, expect, it } from "vitest";

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("public metadata routes", () => {
  it("serves crawler policy without exposing private platform surfaces", () => {
    const policy = robots();
    const rules = Array.isArray(policy.rules) ? policy.rules[0] : policy.rules;

    expect(policy.sitemap).toBe("https://forgath.ru/sitemap.xml");
    expect(rules).toMatchObject({
      userAgent: "*",
      allow: expect.arrayContaining(["/", "/services/task-tracker", "/services/habit-tracker"]),
      disallow: expect.arrayContaining(["/admin", "/api", "/profile", "/me", "/products"]),
    });
    expect(rules.allow).not.toContain("/services/streamer");
  });

  it("publishes only public portal pages in the sitemap", () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toEqual([
      "https://forgath.ru",
      "https://forgath.ru/login",
      "https://forgath.ru/register",
      "https://forgath.ru/services/task-tracker",
      "https://forgath.ru/services/habit-tracker",
    ]);
    expect(urls).not.toContain("https://forgath.ru/services/streamer");
    expect(urls).not.toContain("https://forgath.ru/admin/security");
    expect(urls).not.toContain("https://forgath.ru/api/mcp");
  });
});
