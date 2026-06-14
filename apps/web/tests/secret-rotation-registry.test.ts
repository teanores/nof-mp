import { describe, expect, it } from "vitest";

import { SecretRotationRegistryRepository } from "@/lib/server/secret-rotation-registry";

describe("secret rotation registry repository", () => {
  it("returns metadata-only secret records without values", async () => {
    const registry = await new SecretRotationRegistryRepository().listRegistry();

    expect(registry.length).toBeGreaterThan(0);
    expect(registry.map((item) => item.secretName)).toContain("NOF_MP_EMAIL_WEBHOOK_TOKEN");
    for (const item of registry) {
      expect(Object.keys(item)).not.toContain("value");
      expect(Object.keys(item)).not.toContain("hash");
      expect(Object.keys(item)).not.toContain("preview");
      expect(JSON.stringify(item)).not.toMatch(/secret-value|smtp-pass|Bearer /);
    }
  });
});
