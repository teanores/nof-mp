import "@testing-library/jest-dom/vitest";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PasswordResetPage } from "@/components/PasswordResetPage";

describe("password reset page", () => {
  beforeEach(() => {
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
    expect(screen.getByText(/Ответ формы не раскрывает/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Электронная почта"), "owner@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Получить ссылку" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/public/password-reset/request", expect.any(Object)));
    expect(await screen.findByText(/Если такой аккаунт существует/)).toBeInTheDocument();
  });

  it("keeps repeat-password checklist failed until the repeat field is filled", async () => {
    render(<PasswordResetPage token="reset-token" />);

    const repeatedMatchRule = screen.getByText("Повтор пароля совпадает").closest("li");
    expect(repeatedMatchRule).toHaveTextContent("- Повтор пароля совпадает");

    await userEvent.type(screen.getByLabelText("Новый пароль"), "NextHorse22!");
    expect(repeatedMatchRule).toHaveTextContent("- Повтор пароля совпадает");

    await userEvent.type(screen.getByLabelText("Повтори новый пароль"), "NextHorse22!");
    expect(repeatedMatchRule).toHaveTextContent("+ Повтор пароля совпадает");
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
});
