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
    render(<LoginPage />);

    expect(screen.getByRole("heading", { name: "Единый вход в кузницу" })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "en" } });

    expect(screen.getByRole("heading", { name: "Unified forge sign-in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByText("Password")).toBeInTheDocument();
  });
});
