import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    expect(screen.getByText("«Покажите жетон гильдии!»")).toBeInTheDocument();
    expect(screen.getByText("Электронная почта")).toBeInTheDocument();
    expect(screen.getByTestId("login-copy-block")).toHaveClass("text-center");
    expect(screen.getByRole("link", { name: "Создать аккаунт" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Забыли пароль?" })).toHaveAttribute("href", "/password-reset");
    expect(screen.queryByRole("button", { name: "Sign in" })).not.toBeInTheDocument();
    expect(screen.queryByText("Email")).not.toBeInTheDocument();
    expect(screen.queryByText("Password")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain("Use the account");
    expect(document.body.textContent).not.toContain("Dragon Forge");
    expect(document.body.textContent).not.toContain("Python");
    expect(document.body.textContent).not.toContain("OAuth");
    expect(document.body.textContent).not.toContain("Auth Boundary");
    expect(document.body.textContent).not.toContain("/overview");

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "en" } });

    expect(screen.getByRole("heading", { name: "Forge checkpoint" })).toBeInTheDocument();
    expect(screen.getByText('"Show your guild badge!"')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create account" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", "/password-reset");
    expect(screen.getByText("Password")).toBeInTheDocument();
  });

  it("lets users reveal the login password field", async () => {
    render(<LoginPage next="/overview" />);

    const password = screen.getByLabelText("Пароль");

    expect(password).toHaveAttribute("type", "password");

    await userEvent.click(screen.getByRole("button", { name: "Показать пароль" }));

    expect(password).toHaveAttribute("type", "text");

    await userEvent.click(screen.getByRole("button", { name: "Скрыть пароль" }));

    expect(password).toHaveAttribute("type", "password");
  });

  it("hides registration entry and shows an inline note when registration is paused", () => {
    render(<LoginPage next="/overview" registrationPaused />);

    expect(screen.queryByRole("link", { name: "Создать аккаунт" })).not.toBeInTheDocument();
    expect(screen.getByText("Регистрация временно закрыта")).toBeInTheDocument();
  });

  it("shows a generic access-denied message without account enumeration", () => {
    render(<LoginPage error="access_denied" next="/overview" />);

    expect(screen.getByText("Обратитесь к администратору платформы.")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("пользователь не найден");
    expect(document.body.textContent).not.toContain("аккаунт существует");
    expect(document.body.textContent).not.toContain("нет роли");
    expect(document.body.textContent).not.toContain("недостаточно прав");
  });
});
