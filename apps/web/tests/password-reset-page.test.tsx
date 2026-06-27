import "@testing-library/jest-dom/vitest";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PasswordResetPage } from "@/components/PasswordResetPage";

const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}));

describe("password reset page", () => {
  beforeEach(() => {
    window.localStorage.clear();
    routerPush.mockClear();
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: async () => ({ ok: true }),
      ok: true,
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests a reset link with a uniform non-enumerating response", async () => {
    render(<PasswordResetPage />);

    expect(screen.getByRole("heading", { name: "Восстановление пароля" })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Получить ссылку" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Получить ссылку" })).not.toHaveClass("bg-forge-accent");
    await userEvent.type(screen.getByLabelText("Электронная почта"), "owner@example.com");
    expect(screen.getByRole("button", { name: "Получить ссылку" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Получить ссылку" })).toHaveClass("bg-forge-accent");
    await userEvent.click(screen.getByRole("button", { name: "Получить ссылку" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/public/password-reset/request", expect.any(Object)));
    expect(await screen.findByText(/Если такой аккаунт существует/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Получить ссылку" })).toBeDisabled();
  });

  it("keeps the reset link request disabled until the email is valid", async () => {
    render(<PasswordResetPage />);

    const submit = screen.getByRole("button", { name: "Получить ссылку" });
    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Электронная почта"), "owner");
    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Электронная почта"), "@example.com");
    expect(submit).toBeEnabled();
  });

  it("prefills the reset email when admin opens a recovery action", async () => {
    render(<PasswordResetPage initialEmail="owner@example.com" />);

    expect(screen.getByLabelText("Электронная почта")).toHaveValue("owner@example.com");

    await userEvent.click(screen.getByRole("button", { name: "Получить ссылку" }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/public/password-reset/request",
        expect.objectContaining({
          body: JSON.stringify({ email: "owner@example.com", smartToken: "mock-smartcaptcha-token" }),
        }),
      ),
    );
  });

  it("ignores reset email prefill while confirming an existing token", () => {
    render(<PasswordResetPage initialEmail="owner@example.com" token="reset-token" />);

    expect(screen.getByRole("heading", { name: "Новый пароль" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Электронная почта")).not.toBeInTheDocument();
  });

  it("shows a safe request failure message without exposing account state", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({ error: "request_failed" }),
      ok: false,
    } as Response);

    render(<PasswordResetPage />);

    await userEvent.type(screen.getByLabelText("Электронная почта"), "owner@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Получить ссылку" }));

    expect(await screen.findByText("Не удалось выполнить запрос. Попробуйте позже.")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("owner@example.com");
    expect(document.body).not.toHaveTextContent("SMTP");
    expect(document.body).not.toHaveTextContent("request_failed");
  });

  it("switches request reset copy to English", async () => {
    render(<PasswordResetPage />);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "" }), "en");

    expect(screen.getByRole("heading", { name: "Password recovery" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Get link" })).toBeInTheDocument();
  });

  it("keeps repeat-password checklist failed until the repeat field is filled", async () => {
    render(<PasswordResetPage token="reset-token" />);

    const repeatedMatchRule = screen.getByText("Повтор пароля совпадает").closest("li");
    const submit = screen.getByRole("button", { name: "Сменить пароль" });
    expect(repeatedMatchRule).toHaveTextContent("- Повтор пароля совпадает");
    expect(submit).toBeDisabled();
    expect(submit).not.toHaveClass("bg-forge-accent");

    await userEvent.type(screen.getByLabelText("Новый пароль"), "NextHorse22!");
    expect(repeatedMatchRule).toHaveTextContent("- Повтор пароля совпадает");
    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Повтори новый пароль"), "NextHorse22!");
    expect(repeatedMatchRule).toHaveTextContent("+ Повтор пароля совпадает");
    expect(submit).toBeEnabled();
    expect(submit).toHaveClass("bg-forge-accent");
  });

  it("lets users reveal reset password fields independently", async () => {
    render(<PasswordResetPage token="reset-token" />);

    const newPassword = screen.getByLabelText("Новый пароль");
    const repeatedPassword = screen.getByLabelText("Повтори новый пароль");

    expect(newPassword).toHaveAttribute("type", "password");
    expect(repeatedPassword).toHaveAttribute("type", "password");

    await userEvent.click(screen.getByRole("button", { name: "Показать новый пароль" }));

    expect(newPassword).toHaveAttribute("type", "text");
    expect(repeatedPassword).toHaveAttribute("type", "password");

    await userEvent.click(screen.getByRole("button", { name: "Скрыть новый пароль" }));
    await userEvent.click(screen.getByRole("button", { name: "Показать повтор пароля" }));

    expect(newPassword).toHaveAttribute("type", "password");
    expect(repeatedPassword).toHaveAttribute("type", "text");
  });

  it("shows an expired link state before password entry when preflight rejects the token", async () => {
    render(<PasswordResetPage token="reset-token" tokenStatus="invalid" />);

    expect(screen.getByRole("heading", { name: "Ссылка истекла" })).toBeInTheDocument();
    expect(screen.getByText("Запросите новую ссылку для восстановления пароля.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Получить новую ссылку" })).toHaveAttribute("href", "/password-reset");
    expect(screen.queryByLabelText("Новый пароль")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Сменить пароль" })).not.toBeInTheDocument();
  });

  it("switches confirm reset copy to English", async () => {
    render(<PasswordResetPage token="reset-token" />);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "" }), "en");

    expect(screen.getByRole("heading", { name: "New password" })).toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByLabelText("Repeat new password")).toBeInTheDocument();
    expect(screen.getByText("Repeated password matches")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change password" })).toBeInTheDocument();
  });

  it("confirms a reset token and shows a success state", async () => {
    render(<PasswordResetPage token="reset-token" />);

    await userEvent.type(screen.getByLabelText("Новый пароль"), "NextHorse22!");
    await userEvent.type(screen.getByLabelText("Повтори новый пароль"), "NextHorse22!");
    await userEvent.click(screen.getByRole("button", { name: "Сменить пароль" }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/public/password-reset/confirm",
        expect.objectContaining({
          body: JSON.stringify({ newPassword: "NextHorse22!", token: "reset-token" }),
        }),
      ),
    );
    expect(await screen.findByText("Пароль изменён. Теперь можно войти с новым паролем.")).toBeInTheDocument();
  });

  it("redirects to the main portal after a successful reset confirmation", async () => {
    render(<PasswordResetPage token="reset-token" />);

    await userEvent.type(screen.getByLabelText("Новый пароль"), "NextHorse22!");
    await userEvent.type(screen.getByLabelText("Повтори новый пароль"), "NextHorse22!");
    await userEvent.click(screen.getByRole("button", { name: "Сменить пароль" }));

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/"));
  });

  it("shows server-side password policy details for reset confirmation", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({
        error: "password_policy",
        errors: ["password_min_length", "password_digit", "password_disallowed_character"],
      }),
      ok: false,
    } as Response);

    render(<PasswordResetPage token="reset-token" />);

    await userEvent.type(screen.getByLabelText("Новый пароль"), "NextHorse22!");
    await userEvent.type(screen.getByLabelText("Повтори новый пароль"), "NextHorse22!");
    await userEvent.click(screen.getByRole("button", { name: "Сменить пароль" }));

    expect(
      await screen.findByText(
        "Новый пароль не соответствует правилам безопасности: Минимум 12 символов. Добавь цифру. Убери пробелы и обратную кавычку.",
      ),
    ).toBeInTheDocument();
  });

  it("shows an expired link message for invalid reset tokens", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({ error: "invalid_or_expired_token" }),
      ok: false,
    } as Response);

    render(<PasswordResetPage token="reset-token" />);

    await userEvent.type(screen.getByLabelText("Новый пароль"), "NextHorse22!");
    await userEvent.type(screen.getByLabelText("Повтори новый пароль"), "NextHorse22!");
    await userEvent.click(screen.getByRole("button", { name: "Сменить пароль" }));

    expect(await screen.findByText("Ссылка недействительна или срок действия истёк.")).toBeInTheDocument();
  });
});
