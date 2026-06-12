import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { AdminUsersPage } from "@/components/AdminUsersPage";
import type { AdminUserListItem } from "@/lib/server/admin-users-repository";

const users: AdminUserListItem[] = [
  {
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
  },
  {
    accountState: "password-login",
    createdAt: "2026-06-02T10:00:00.000Z",
    email: "owner@example.com",
    hasPassword: true,
    id: "u-2",
    lastSeen: "2026-06-02T11:00:00.000Z",
    recoveryState: "email-reset-ready",
    risks: ["external-email"],
    username: "owner",
  },
];

describe("admin users page", () => {
  it("uses Russian email copy on the admin account table", () => {
    render(<AdminUsersPage users={users} />);

    expect(screen.getByText("Электронная почта")).toBeInTheDocument();
    expect(screen.getByText("Восстановление")).toBeInTheDocument();
    expect(screen.getByText("Восстановление по почте")).toBeInTheDocument();
    expect(screen.getByText("почтовое восстановление")).toBeInTheDocument();
    expect(screen.getByText("служебная почта")).toBeInTheDocument();
    expect(screen.getByText("почта вне домена")).toBeInTheDocument();
    expect(screen.getByText("Признаки")).toBeInTheDocument();
    expect(screen.getAllByText(/признаки риска доступа/)).toHaveLength(2);
    expect(document.body).not.toHaveTextContent("Email");
    expect(document.body).not.toHaveTextContent("внешняя почта");
    expect(document.body).not.toHaveTextContent("внешний email");
    expect(document.body).not.toHaveTextContent("служебные email");
  });

  it("keeps short account and risk labels on one readable badge line", () => {
    render(<AdminUsersPage users={users} />);

    for (const label of ["пароль не задан", "нет пароля", "служебная telegram-почта", "служебная почта", "почтовое восстановление"]) {
      expect(screen.getByText(label)).toHaveClass("whitespace-nowrap");
    }
    for (const label of screen.getAllByText("Открыть")) {
      expect(label).toHaveClass("whitespace-nowrap");
    }
  });

  it("uses Russian fallback text for unknown registration source", () => {
    render(<AdminUsersPage users={users} />);

    expect(screen.getByText("источник неизвестен")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("source unknown");
    expect(document.body).not.toHaveTextContent("telegram email");
  });

  it("links each user row to a read-only account detail page", () => {
    render(<AdminUsersPage users={users} />);

    expect(screen.getByRole("link", { name: "Открыть teanore" })).toHaveAttribute("href", "/admin/users/u-1");
    expect(screen.getByRole("link", { name: "Открыть owner" })).toHaveAttribute("href", "/admin/users/u-2");
  });
});
