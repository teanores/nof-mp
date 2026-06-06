export type PortalLanguage = "ru" | "en";

export const defaultPortalLanguage: PortalLanguage = "ru";
export const languageChangeEventName = "nof-mp-language-change";
export const portalLanguageStorageKey = "nof-mp-language";
// Legacy key written by old nof-forge-tasks builds — migrated on first load in use-portal-language
export const legacyPortalLanguageStorageKey = "nof-forge-tasks-language";

export const portalLanguageOptions: Array<{ label: string; value: PortalLanguage }> = [
  { label: "Русский", value: "ru" },
  { label: "English", value: "en" },
];

export function normalizePortalLanguage(value: FormDataEntryValue | string | null | undefined): PortalLanguage {
  return value === "en" ? "en" : defaultPortalLanguage;
}