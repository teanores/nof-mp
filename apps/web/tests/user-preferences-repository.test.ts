import { describe, expect, it } from "vitest";

import { platformPreferencesSchemaName } from "@/lib/server/user-preferences-repository";

describe("user preferences repository", () => {
  it("uses the platform schema by default", () => {
    expect(platformPreferencesSchemaName()).toBe("nof_platform");
  });
});