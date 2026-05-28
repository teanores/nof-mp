"use client";

import { useEffect, useState } from "react";

import {
  defaultPortalLanguage,
  languageChangeEventName,
  normalizePortalLanguage,
  portalLanguageOptions,
  portalLanguageStorageKey,
  type PortalLanguage,
} from "@/lib/portal-language";
import { updatePortalPreferences } from "@/lib/platform-api";
import React from "react";

interface PortalLanguageSelectProps {
  formId?: string;
  initialLanguage?: PortalLanguage;
  name?: string;
  persistToProfile?: boolean;
}

export function PortalLanguageSelect({ formId, initialLanguage = defaultPortalLanguage, name, persistToProfile = false }: PortalLanguageSelectProps) {
  const [language, setLanguage] = useState<PortalLanguage>(initialLanguage);

  useEffect(() => {
    const saved = window.localStorage.getItem(portalLanguageStorageKey);
    const nextLanguage = persistToProfile ? normalizePortalLanguage(initialLanguage) : normalizePortalLanguage(saved ?? initialLanguage);
    setLanguage(nextLanguage);
    window.localStorage.setItem(portalLanguageStorageKey, nextLanguage);
    document.documentElement.lang = nextLanguage;
  }, [initialLanguage, persistToProfile]);

  function selectLanguage(nextValue: string) {
    const nextLanguage = normalizePortalLanguage(nextValue);
    setLanguage(nextLanguage);
    window.localStorage.setItem(portalLanguageStorageKey, nextLanguage);
    document.documentElement.lang = nextLanguage;
    window.dispatchEvent(new CustomEvent(languageChangeEventName, { detail: nextLanguage }));

    if (persistToProfile) {
      void updatePortalPreferences({ language: nextLanguage }).catch(() => undefined);
    }
  }

  return (
    <div className="inline-flex">
      <select
        className="rounded-sm border border-forge-line bg-forge-panel px-3 py-2 text-sm text-forge-ink outline-none transition focus:border-forge-accent"
        form={formId}
        name={name}
        value={language}
        onChange={(event) => selectLanguage(event.target.value)}
      >
        {portalLanguageOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
