"use client";

import React, { useEffect, useState } from "react";

import { usePortalLanguage } from "@/lib/use-portal-language";

type Theme = "dark" | "light" | "system";

export const portalThemeStorageKey = "nof-mp-theme";
export const legacyPortalThemeStorageKey = "nof-forge-tasks-theme";

function systemPrefersLight(): boolean {
  return window.matchMedia("(prefers-color-scheme: light)").matches;
}

function applyTheme(theme: Theme) {
  const useLight = theme === "light" || (theme === "system" && systemPrefersLight());
  document.documentElement.classList.toggle("light", useLight);
}

export function ThemeToggle() {
  const language = usePortalLanguage();
  const [theme, setTheme] = useState<Theme>("system");
  const labels: Record<Theme, string> =
    language === "en"
      ? { dark: "DARK", light: "LIGHT", system: "SYSTEM" }
      : { dark: "ТЕНЬ", light: "СВЕТ", system: "КАК В СИСТЕМЕ" };

  useEffect(() => {
    const legacyTheme = window.localStorage.getItem(legacyPortalThemeStorageKey);
    if (legacyTheme) {
      window.localStorage.setItem(portalThemeStorageKey, legacyTheme);
      window.localStorage.removeItem(legacyPortalThemeStorageKey);
    }

    const saved = window.localStorage.getItem(portalThemeStorageKey);
    const initialTheme: Theme = saved === "light" || saved === "dark" ? saved : "system";
    setTheme(initialTheme);
    applyTheme(initialTheme);

    const media = window.matchMedia("(prefers-color-scheme: light)");
    const handleSystemThemeChange = () => {
      if ((window.localStorage.getItem(portalThemeStorageKey) ?? "system") === "system") {
        applyTheme("system");
      }
    };
    media.addEventListener("change", handleSystemThemeChange);
    return () => media.removeEventListener("change", handleSystemThemeChange);
  }, []);

  function selectTheme(nextTheme: Theme) {
    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem(portalThemeStorageKey, nextTheme);
  }

  return (
    <div className="grid grid-cols-3 overflow-hidden rounded-sm border border-forge-line bg-forge-panel">
      {(["light", "dark", "system"] as const).map((value) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            className={`tech-label min-h-10 min-w-[92px] px-3 text-center text-[10px] transition ${
              isActive ? "bg-forge-accent text-black" : "bg-forge-surface text-forge-muted hover:text-forge-accent"
            }`}
            type="button"
            aria-pressed={isActive}
            onClick={() => selectTheme(value)}
          >
            {labels[value]}
          </button>
        );
      })}
    </div>
  );
}
