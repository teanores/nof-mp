import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminUserDetailPage } from "@/components/AdminUserDetailPage";
import type { AdminUserListItem } from "@/lib/server/admin-users-repository";
import type { ForgeServiceLink } from "@/lib/types";

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
const connectedLinks: ForgeServiceLink[] = [
  {
    serviceKey: "nof-ht",
    serviceName: "Habit Tracker",
    status: "connected",
    accountEmail: "habit@example.com",
    accountLabel: "Habit User",
    linkedAt: "2026-06-11T10:00:00.000Z",
    canUnlink: true,
    openHref: "https://habit-tracker.forgath.ru/api/auth/platform/authorize?callbackUrl=%2F",
  },
];
const unavailableLinks: ForgeServiceLink[] = [
  {
    serviceKey: "nof-ht",
    serviceName: "Habit Tracker",
    status: "unavailable",
    canUnlink: false,
    openHref: "https://habit-tracker.forgath.ru/api/auth/platform/authorize?callbackUrl=%2F",
  },
];
const recentActivity = [
  {
    activityLabel: "Успешный вход",
    createdAt: "2026-06-20T08:00:00.000Z",
    id: "event-1",
    method: "POST",
    path: "/api/login",
    statusCode: 303,
  },
];

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
        "/api/admin/users/u-2/password-reset",
        expect.objectContaining({
          method: "POST",
        }),
      ),
    );
    expect(await screen.findByText("Письмо восстановления отправлено, если аккаунт может получать почту.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Письмо отправлено" })).toBeDisabled();
    expect(document.body).not.toHaveTextContent("password_hash");
    expect(document.body).not.toHaveTextContent("reset-token");
  });

  it("prevents duplicate recovery email clicks after a successful send", async () => {
    render(<AdminUserDetailPage user={recoverableUser} />);

    await userEvent.click(screen.getByRole("button", { name: "Отправить письмо восстановления" }));
    await screen.findByRole("button", { name: "Письмо отправлено" });

    await userEvent.click(screen.getByRole("button", { name: "Письмо отправлено" }));

    expect(fetch).toHaveBeenCalledTimes(1);
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

  it("shows linked service state for the selected user without admin-side unlink controls", () => {
    render(<AdminUserDetailPage serviceLinks={connectedLinks} user={recoverableUser} />);

    expect(screen.getByRole("heading", { name: "Состояние связей аккаунта" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Habit Tracker" })).toBeInTheDocument();
    expect(screen.getByText("связано")).toBeInTheDocument();
    expect(screen.getByText("Habit User")).toBeInTheDocument();
    expect(screen.getByText("habit@example.com")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /отключ/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /отключ/i })).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("Bearer");
    expect(document.body).not.toHaveTextContent("jwt");
    expect(document.body).not.toHaveTextContent("token");
    expect(document.body).not.toHaveTextContent("secret");
  });

  it("keeps the admin user card readable when service links are unavailable", () => {
    render(<AdminUserDetailPage serviceLinks={unavailableLinks} user={recoverableUser} />);

    expect(screen.getByRole("heading", { name: "Состояние связей аккаунта" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Habit Tracker" })).toBeInTheDocument();
    expect(screen.getByText("недоступно")).toBeInTheDocument();
    expect(screen.getByText("учётная запись не указана")).toBeInTheDocument();
    expect(screen.getByText("не указан")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("db_down");
    expect(document.body).not.toHaveTextContent("internal");
  });

  it("shows recent sanitized account activity", () => {
    render(<AdminUserDetailPage recentActivity={recentActivity} user={recoverableUser} />);

    expect(screen.getByRole("heading", { name: "Последние события аккаунта" })).toBeInTheDocument();
    expect(screen.getByText("Успешный вход")).toBeInTheDocument();
    expect(screen.getByText("POST")).toBeInTheDocument();
    expect(screen.getByText("/api/login")).toBeInTheDocument();
    expect(screen.getByText("303")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("password");
    expect(document.body).not.toHaveTextContent("Bearer");
    expect(document.body).not.toHaveTextContent("token");
    expect(document.body).not.toHaveTextContent("secret");
  });

  it("shows a concise empty activity state", () => {
    render(<AdminUserDetailPage recentActivity={[]} user={recoverableUser} />);

    expect(screen.getByRole("heading", { name: "Последние события аккаунта" })).toBeInTheDocument();
    expect(screen.getByText("Событий по этому пользователю пока нет.")).toBeInTheDocument();
  });
});
