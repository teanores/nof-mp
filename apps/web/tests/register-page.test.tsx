import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    expect(screen.getByLabelText("Повтори пароль")).toHaveAttribute("name", "repeatedPassword");
    expect(screen.getByText("Правила пароля")).toBeInTheDocument();
    expect(screen.getByText("Минимум 12 символов")).toBeInTheDocument();
    expect(screen.getByText("Повтор пароля совпадает")).toBeInTheDocument();
    expect(screen.getByText("ЯЗЫК")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveAttribute("name", "language");
    expect(screen.getByText(/Согласие с условиями появится после публикации настоящего соглашения/)).toBeInTheDocument();
    expect(screen.getByText(/Внешние мессенджеры не используются как самостоятельный способ/)).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(screen.getByRole("link", { name: "Юридические аспекты" })).toHaveAttribute("href", "/legal");
    expect(screen.getByRole("button", { name: "Получить код" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Войти" })).toHaveAttribute("href", "/login");
    expect(document.querySelector("form")).toHaveAttribute("action", "/api/portal/registration/request");
    expect(document.querySelector("form")).toHaveAttribute("id", "portal-registration-form");
    expect(document.body.textContent).not.toContain("Dragon Forge");
    expect(document.body.textContent).not.toContain("Python");
    expect(document.body.textContent).not.toContain("OAuth");
    expect(document.body.textContent).not.toContain("SMTP");
    expect(document.body.textContent).not.toContain("backend");
    expect(document.body.textContent).not.toContain("Registration rules");
  });

  it("requires a strong repeated password before registration can be submitted", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    const password = screen.getByLabelText("Пароль");
    const repeatedPassword = screen.getByLabelText("Повтори пароль");
    const submit = screen.getByRole("button", { name: "Получить код" });

    await user.type(screen.getByLabelText("Логин"), "local_user");
    await user.type(screen.getByLabelText("Электронная почта"), "local@example.test");
    await user.type(password, "weak");
    await user.type(repeatedPassword, "weak");

    expect(screen.getByText("Минимум 12 символов").closest("li")).toHaveTextContent("-");
    expect(submit).toBeDisabled();

    await user.clear(password);
    await user.clear(repeatedPassword);
    await user.type(password, "StrongLocal1!");
    await user.type(repeatedPassword, "DifferentLocal1!");

    expect(screen.getByText("Повтор пароля совпадает").closest("li")).toHaveTextContent("-");
    expect(submit).toBeDisabled();

    await user.clear(repeatedPassword);
    await user.type(repeatedPassword, "StrongLocal1!");

    expect(screen.getByText("Повтор пароля совпадает").closest("li")).toHaveTextContent("+");
    expect(submit).toBeEnabled();
  });

  it("keeps code request disabled until username and email are filled", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    const submit = screen.getByRole("button", { name: "Получить код" });

    await user.type(screen.getByLabelText("Пароль"), "StrongLocal1!");
    await user.type(screen.getByLabelText("Повтори пароль"), "StrongLocal1!");

    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText("Логин"), "local_user");
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText("Электронная почта"), "local@example.test");
    expect(submit).toBeEnabled();
  });

  it("lets users show and hide both registration password fields", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    const password = screen.getByLabelText("Пароль");
    const repeatedPassword = screen.getByLabelText("Повтори пароль");

    expect(password).toHaveAttribute("type", "password");
    expect(repeatedPassword).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Показать пароль" }));

    expect(password).toHaveAttribute("type", "text");
    expect(repeatedPassword).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Скрыть пароль" }));

    expect(password).toHaveAttribute("type", "password");
    expect(repeatedPassword).toHaveAttribute("type", "password");
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
