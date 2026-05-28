import { describe, expect, it } from "vitest";

import { defaultPortalLanguage, normalizePortalLanguage, portalLanguageOptions } from "@/lib/portal-language";

describe("portal language settings", () => {
  it("defaults to Russian", () => {
    expect(defaultPortalLanguage).toBe("ru");
    expect(normalizePortalLanguage(undefined)).toBe("ru");
    expect(normalizePortalLanguage("")).toBe("ru");
    expect(normalizePortalLanguage("de")).toBe("ru");
  });

  it("supports Russian and English options", () => {
    expect(portalLanguageOptions).toEqual([
      { label: "Русский", value: "ru" },
      { label: "English", value: "en" },
    ]);
    expect(normalizePortalLanguage("ru")).toBe("ru");
    expect(normalizePortalLanguage("en")).toBe("en");
  });
});