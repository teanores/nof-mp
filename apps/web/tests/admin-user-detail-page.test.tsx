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
});
