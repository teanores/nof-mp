import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminUserDetailPage } from "@/components/AdminUserDetailPage";
import type { AdminUserListItem } from "@/lib/server/admin-users-repository";

const user: AdminUserListItem = {
  accountState: "telegram-only",
  createdAt: "2026-06-01T10:00:00.000Z",
  email: "251740038@telegram.forgath.ru",
  hasPassword: false,
  id: "u-1",
  lastSeen: "2026-06-01T11:00:00.000Z",
  recoveryState: "service-email",
  registrationSource: "telegram",
  risks: ["missing-password", "telegram-placeholder-email"],
  role: { displayName: "Администратор", name: "admin" },
  telegram: { id: 251740038, username: "teanore" },
  username: "teanore",
};

const recoverableUser: AdminUserListItem = {
  accountState: "password-login",
  createdAt: "2026-06-02T10:00:00.000Z",
  email: "owner@example.com",
  hasPassword: true,
  id: "u-2",
  lastSeen: "2026-06-02T11:00:00.000Z",
  recoveryState: "email-reset-ready",
  registrationSource: "email",
  risks: ["external-email"],
  role: { displayName: "Администратор", name: "admin" },
  username: "owner",
};

describe("admin user detail page", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: async () => ({ ok: true }),
      ok: true,
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a safe Russian account inspection page", () => {
    render(<AdminUserDetailPage user={user} />);

    expect(screen.getByRole("heading", { name: "Карточка пользователя" })).toBeInTheDocument();
    expect(screen.getByText("teanore")).toBeInTheDocument();
    expect(screen.getByText("251740038@telegram.forgath.ru")).toBeInTheDocument();
    expect(screen.getByText("Администратор")).toBeInTheDocument();
    expect(screen.getByText("@teanore")).toBeInTheDocument();
    expect(screen.getByText("пароль не задан")).toBeInTheDocument();
    expect(screen.getByText("служебная почта")).toBeInTheDocument();
    expect(screen.getByText("служебная telegram-почта")).toBeInTheDocument();
    expect(screen.getByText("нет пароля")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("password_hash");
    expect(document.body).not.toHaveTextContent("token");
    expect(document.body).not.toHaveTextContent("secret");
  });

  it("sends a recovery email directly for accounts with a real email", async () => {
    render(<AdminUserDetailPage user={recoverableUser} />);

    expect(screen.getByRole("heading", { name: "Действия с доступом" })).toBeInTheDocument();
    expect(screen.getByText("Почтовое восстановление доступно")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Открыть восстановление пароля" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Отправить письмо восстановления" }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/public/password-reset/request",
        expect.objectContaining({
          body: JSON.stringify({ email: "owner@example.com" }),
        }),
      ),
    );
    expect(await screen.findByText("Письмо восстановления отправлено, если аккаунт может получать почту.")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("password_hash");
    expect(document.body).not.toHaveTextContent("reset-token");
  });

  it("shows a safe error when direct recovery email delivery request fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({ error: "request_failed" }),
      ok: false,
    } as Response);

    render(<AdminUserDetailPage user={recoverableUser} />);

    await userEvent.click(screen.getByRole("button", { name: "Отправить письмо восстановления" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Письмо не отправлено. Повтори позже.");
    expect(document.body).not.toHaveTextContent("request_failed");
    expect(document.body).not.toHaveTextContent("SMTP");
  });

  it("explains why password recovery is blocked for service emails", () => {
    render(<AdminUserDetailPage user={user} />);

    expect(screen.getByRole("heading", { name: "Действия с доступом" })).toBeInTheDocument();
    expect(screen.getByText("Восстановление по почте недоступно")).toBeInTheDocument();
    expect(screen.getByText("У пользователя служебная почта. Сначала нужна реальная электронная почта.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Отправить письмо восстановления" })).not.toBeInTheDocument();
  });
});
