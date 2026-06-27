import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";

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
    expect(screen.getByText("Не содержит логин или часть email")).toBeInTheDocument();
    expect(screen.getByText("Повтор пароля совпадает")).toBeInTheDocument();
    expect(screen.getByText("ЯЗЫК")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveAttribute("name", "language");
    expect(screen.getByText(/Согласие с условиями появится после публикации настоящего соглашения/)).toBeInTheDocument();
    expect(screen.getByText(/Внешние мессенджеры не используются как самостоятельный способ/)).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(screen.getByRole("link", { name: "Юридические аспекты" })).toHaveAttribute("href", "/legal");
    expect(screen.getByRole("button", { name: "Получить код" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Получить код" })).not.toHaveClass("bg-forge-accent");
    expect(screen.getByRole("button", { name: "Назад" })).toHaveAttribute("type", "button");
    expect(document.querySelector('input[name="smart-token"]')).toHaveValue("mock-smartcaptcha-token");
    expect(screen.queryByRole("link", { name: "Войти" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "На портал" })).not.toBeInTheDocument();
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
    await user.type(password, "CorrectHorse1!");
    await user.type(repeatedPassword, "DifferentLocal1!");

    expect(screen.getByText("Повтор пароля совпадает").closest("li")).toHaveTextContent("-");
    expect(submit).toBeDisabled();

    await user.clear(repeatedPassword);
    await user.type(repeatedPassword, "CorrectHorse1!");

    expect(screen.getByText("Повтор пароля совпадает").closest("li")).toHaveTextContent("+");
    expect(submit).toBeEnabled();
  });

  it("uses a real back action instead of login or portal navigation links", async () => {
    const user = userEvent.setup();
    const back = vi.spyOn(window.history, "back").mockImplementation(() => undefined);
    window.history.pushState({}, "", "/overview");
    window.history.pushState({}, "", "/register");
    render(<RegisterPage />);

    await user.click(screen.getByRole("button", { name: "Назад" }));

    expect(back).toHaveBeenCalledTimes(1);

    back.mockRestore();
  });

  it("keeps code request disabled when password contains username or email local part", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    const submit = screen.getByRole("button", { name: "Получить код" });

    await user.type(screen.getByLabelText("Логин"), "localuser");
    await user.type(screen.getByLabelText("Электронная почта"), "localuser@example.com");
    await user.type(screen.getByLabelText("Пароль"), "localuserA123!");
    await user.type(screen.getByLabelText("Повтори пароль"), "localuserA123!");

    expect(screen.getByText("Не содержит логин или часть email").closest("li")).toHaveTextContent("-");
    expect(submit).toBeDisabled();
    expect(submit).not.toHaveClass("bg-forge-accent");
  });

  it("keeps code request disabled until username and email are filled", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    const submit = screen.getByRole("button", { name: "Получить код" });

    await user.type(screen.getByLabelText("Пароль"), "CorrectHorse1!");
    await user.type(screen.getByLabelText("Повтори пароль"), "CorrectHorse1!");

    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText("Логин"), "local_user");
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText("Электронная почта"), "local@example.test");
    expect(submit).toBeEnabled();
    expect(submit).toHaveClass("bg-forge-accent");
  });

  it("lets users show and hide registration password fields with field-level controls", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    const password = screen.getByLabelText("Пароль");
    const repeatedPassword = screen.getByLabelText("Повтори пароль");

    expect(password).toHaveAttribute("type", "password");
    expect(repeatedPassword).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Показать пароль" }));

    expect(password).toHaveAttribute("type", "text");
    expect(repeatedPassword).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Скрыть пароль" }));

    expect(password).toHaveAttribute("type", "password");
    expect(repeatedPassword).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Показать повтор пароля" }));

    expect(password).toHaveAttribute("type", "password");
    expect(repeatedPassword).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Скрыть повтор пароля" }));

    expect(password).toHaveAttribute("type", "password");
    expect(repeatedPassword).toHaveAttribute("type", "password");
  });

  it("shows the confirmation form when email is pending", () => {
    render(<RegisterPage step="confirm" email="urdzurab@proton.me" />);

    expect(screen.getByRole("heading", { name: "Введите код подтверждения" })).toBeInTheDocument();
    expect(screen.getByText(/urdzurab@proton\.me/)).toBeInTheDocument();
    expect(screen.getByLabelText("Код из письма")).toHaveAttribute("name", "code");
    expect(screen.getByRole("button", { name: "Завершить регистрацию" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Завершить регистрацию" })).not.toHaveClass("bg-forge-accent");
    expect(document.querySelector("form")).toHaveAttribute("action", "/api/portal/registration/confirm");
  });

  it("enables registration confirmation only for a 6 digit code", async () => {
    const user = userEvent.setup();
    render(<RegisterPage step="confirm" email="urdzurab@proton.me" />);

    const code = screen.getByLabelText("Код из письма");
    const submit = screen.getByRole("button", { name: "Завершить регистрацию" });

    await user.type(code, "12ab3");

    expect(code).toHaveValue("123");
    expect(submit).toBeDisabled();

    await user.type(code, "456");

    expect(code).toHaveValue("123456");
    expect(submit).toBeEnabled();
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

  it("shows a specific message for malformed email addresses", () => {
    render(<RegisterPage error="invalid_email" />);

    expect(screen.getByText(/Проверьте email/)).toBeInTheDocument();
    expect(screen.getByText(/name@example\.com/)).toBeInTheDocument();
  });

  it("shows a specific message for server-side password policy rejection", () => {
    render(<RegisterPage error="password_policy" />);

    expect(screen.getByText("Пароль не соответствует правилам безопасности.")).toBeInTheDocument();
  });

  it("shows a specific message when registration code email delivery fails", () => {
    render(<RegisterPage error="email_delivery" />);

    expect(screen.getByText(/Не удалось отправить код на email/)).toBeInTheDocument();
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
