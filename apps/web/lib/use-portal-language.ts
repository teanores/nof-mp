"use client";

import { useEffect, useState } from "react";

import {
  defaultPortalLanguage,
  languageChangeEventName,
  legacyPortalLanguageStorageKey,
  normalizePortalLanguage,
  portalLanguageStorageKey,
  type PortalLanguage,
} from "@/lib/portal-language";

export function usePortalLanguage(initialLanguage: PortalLanguage = defaultPortalLanguage): PortalLanguage {
  const [language, setLanguage] = useState<PortalLanguage>(initialLanguage);

  useEffect(() => {
    const legacy = window.localStorage.getItem(legacyPortalLanguageStorageKey);
    if (legacy) {
      window.localStorage.setItem(portalLanguageStorageKey, legacy);
      window.localStorage.removeItem(legacyPortalLanguageStorageKey);
    }
    const saved = window.localStorage.getItem(portalLanguageStorageKey);
    const nextLanguage = normalizePortalLanguage(saved ?? initialLanguage);
    setLanguage(nextLanguage);
    document.documentElement.lang = nextLanguage;

    function handleLanguageChange(event: Event) {
      const nextValue = event instanceof CustomEvent ? event.detail : window.localStorage.getItem(portalLanguageStorageKey);
      setLanguage(normalizePortalLanguage(String(nextValue ?? defaultPortalLanguage)));
    }

    window.addEventListener(languageChangeEventName, handleLanguageChange);
    return () => window.removeEventListener(languageChangeEventName, handleLanguageChange);
  }, [initialLanguage]);

  return language;
}
