import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { RegisterPage } from "@/components/RegisterPage";

describe("register page", () => {
  it("shows the email registration request form", () => {
    render(<RegisterPage />);

    expect(screen.getByRole("heading", { name: "Регистрация в кузницу" })).toBeInTheDocument();
    expect(screen.getByLabelText("Логин")).toHaveAttribute("name", "username");
    expect(screen.getByLabelText("Email")).toHaveAttribute("name", "email");
    expect(screen.getByLabelText("Пароль")).toHaveAttribute("name", "password");
    expect(screen.getByRole("button", { name: "Получить код" })).toBeInTheDocument();
    expect(document.querySelector("form")).toHaveAttribute("action", "/api/portal/registration/request");
  });

  it("shows the confirmation form when email is pending", () => {
    render(<RegisterPage step="confirm" email="urdzurab@proton.me" />);

    expect(screen.getByRole("heading", { name: "Введите код подтверждения" })).toBeInTheDocument();
    expect(screen.getByText(/urdzurab@proton\.me/)).toBeInTheDocument();
    expect(screen.getByLabelText("Код из письма")).toHaveAttribute("name", "code");
    expect(screen.getByRole("button", { name: "Завершить регистрацию" })).toBeInTheDocument();
    expect(document.querySelector("form")).toHaveAttribute("action", "/api/portal/registration/confirm");
  });

  it("shows a controlled unavailable state before backend rollout", () => {
    render(<RegisterPage error="unavailable" />);

    expect(screen.getByText(/Регистрация почти готова/)).toBeInTheDocument();
    expect(screen.getByText(/Python backend и SMTP-контур/)).toBeInTheDocument();
  });

  it("guards against mojibake in owner-facing text", () => {
    render(<RegisterPage />);

    const visibleText = document.body.textContent ?? "";
    for (const marker of ["Р ", "Рµ", "Рџ", "СЃ", "вЂ", "�"]) {
      expect(visibleText).not.toContain(marker);
    }
    expect(visibleText).not.toContain("???");
  });
});
