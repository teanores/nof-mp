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
    risks: [],
    username: "owner",
  },
];

describe("admin users page", () => {
  it("keeps short account and risk labels on one readable badge line", () => {
    render(<AdminUsersPage users={users} />);

    for (const label of ["пароль не задан", "нет пароля", "telegram-почта"]) {
      expect(screen.getByText(label)).toHaveClass("whitespace-nowrap");
    }
    for (const label of screen.getAllByText("блокировка готовится")) {
      expect(label).toHaveClass("whitespace-nowrap");
    }
  });

  it("uses Russian fallback text for unknown registration source", () => {
    render(<AdminUsersPage users={users} />);

    expect(screen.getByText("источник неизвестен")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("source unknown");
    expect(document.body).not.toHaveTextContent("telegram email");
  });
});
