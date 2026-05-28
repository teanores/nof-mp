import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ThemeToggle } from "@/components/ThemeToggle";
import { languageChangeEventName, portalLanguageStorageKey } from "@/lib/portal-language";

describe("theme toggle", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("updates button labels when portal language changes", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation(() => ({
        addEventListener: vi.fn(),
        matches: false,
        removeEventListener: vi.fn(),
      })),
    });

    render(<ThemeToggle />);

    expect(screen.getByRole("button", { name: "СВЕТ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ТЕНЬ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "КАК В СИСТЕМЕ" })).toBeInTheDocument();

    window.localStorage.setItem(portalLanguageStorageKey, "en");
    fireEvent(window, new CustomEvent(languageChangeEventName, { detail: "en" }));

    expect(screen.getByRole("button", { name: "LIGHT" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "DARK" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "SYSTEM" })).toBeInTheDocument();
  });
});
