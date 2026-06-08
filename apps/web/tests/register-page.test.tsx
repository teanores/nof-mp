import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { RegisterPage } from "@/components/RegisterPage";

describe("register page", () => {
  it("shows the email registration request form", () => {
    render(<RegisterPage />);

    expect(screen.getByRole("heading", { name: "Стойка регистрации" })).toBeInTheDocument();
    expect(screen.getByText("Narag'Othal Forgath")).toBeInTheDocument();
    expect(screen.getByLabelText("Логин")).toHaveAttribute("name", "username");
    expect(screen.getByLabelText("Электронная почта")).toHaveAttribute("name", "email");
    expect(screen.getByLabelText("Пароль")).toHaveAttribute("name", "password");
    expect(screen.getByText("Правила регистрации")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Получить код" })).toBeInTheDocument();
    expect(document.querySelector("form")).toHaveAttribute("action", "/api/portal/registration/request");
    expect(document.body.textContent).not.toContain("Dragon Forge");
    expect(document.body.textContent).not.toContain("Python");
    expect(document.body.textContent).not.toContain("OAuth");
    expect(document.body.textContent).not.toContain("SMTP");
    expect(document.body.textContent).not.toContain("backend");
    expect(document.body.textContent).not.toContain("Registration rules");
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

    expect(screen.getByText(/Регистрация временно недоступна/)).toBeInTheDocument();
    expect(screen.getByText(/войти в уже созданную учётную запись/)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("технические шоколадки");
    expect(document.body.textContent).not.toContain("Python");
    expect(document.body.textContent).not.toContain("SMTP");
    expect(document.body.textContent).not.toContain("backend");
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
