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
];

describe("admin users page", () => {
  it("keeps short account and risk labels on one readable badge line", () => {
    render(<AdminUsersPage users={users} />);

    for (const label of ["пароль не задан", "нет пароля", "telegram email", "блокировка готовится"]) {
      expect(screen.getByText(label)).toHaveClass("whitespace-nowrap");
    }
  });
});
