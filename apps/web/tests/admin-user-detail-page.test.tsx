import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

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

  it("shows a recovery action for accounts with a real email", () => {
    render(<AdminUserDetailPage user={recoverableUser} />);

    expect(screen.getByRole("heading", { name: "Действия с доступом" })).toBeInTheDocument();
    expect(screen.getByText("Почтовое восстановление доступно")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Открыть восстановление пароля" })).toHaveAttribute(
      "href",
      "/password-reset?email=owner%40example.com",
    );
    expect(document.body).not.toHaveTextContent("password_hash");
    expect(document.body).not.toHaveTextContent("reset-token");
  });

  it("explains why password recovery is blocked for service emails", () => {
    render(<AdminUserDetailPage user={user} />);

    expect(screen.getByRole("heading", { name: "Действия с доступом" })).toBeInTheDocument();
    expect(screen.getByText("Восстановление по почте недоступно")).toBeInTheDocument();
    expect(screen.getByText("У пользователя служебная почта. Сначала нужна реальная электронная почта.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Открыть восстановление пароля" })).not.toBeInTheDocument();
  });
});
