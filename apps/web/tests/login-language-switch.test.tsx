import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import { LoginPage } from "@/components/LoginPage";

describe("login language switch", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("changes login page copy immediately when language changes", () => {
    render(<LoginPage next="/overview" />);

    expect(screen.getByRole("heading", { name: "Проходная Кузни" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Создать аккаунт" })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("Dragon Forge");
    expect(document.body.textContent).not.toContain("Python");
    expect(document.body.textContent).not.toContain("OAuth");
    expect(document.body.textContent).not.toContain("Auth Boundary");
    expect(document.body.textContent).not.toContain("/overview");

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "en" } });

    expect(screen.getByRole("heading", { name: "Forge checkpoint" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create account" })).toBeInTheDocument();
    expect(screen.getByText("Password")).toBeInTheDocument();
  });
});
