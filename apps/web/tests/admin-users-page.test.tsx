import { fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { AdminUsersPage } from "@/components/AdminUsersPage";
import type { AdminUserListItem } from "@/lib/server/admin-users-repository";

const users: AdminUserListItem[] = [
  {
    accountState: "telegram-only",
    accessState: "active",
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
    accessState: "denied",
    createdAt: "2026-06-02T10:00:00.000Z",
    email: "owner@example.com",
    hasPassword: true,
    id: "u-2",
    lastSeen: "2026-06-02T11:00:00.000Z",
    recoveryState: "email-reset-ready",
    risks: ["external-email"],
    username: "owner",
  },
  {
    accountState: "password-login",
    accessState: "active",
    createdAt: "2026-06-03T10:00:00.000Z",
    email: "moderator@forgath.ru",
    hasPassword: true,
    id: "u-3",
    lastSeen: "2026-06-03T11:00:00.000Z",
    recoveryState: "email-reset-ready",
    registrationSource: "email",
    risks: [],
    role: { displayName: "Модератор", name: "moderator" },
    telegram: { username: "mod_nof" },
    username: "moderator",
  },
];

describe("admin users page", () => {
  it("uses Russian email copy on the admin account table", () => {
    render(<AdminUsersPage users={users} />);

    expect(screen.getByText("Электронная почта")).toBeInTheDocument();
    expect(screen.getAllByText("Восстановление").length).toBeGreaterThan(0);
    expect(screen.getByText("Восстановление по почте")).toBeInTheDocument();
    expect(screen.getAllByText("почтовое восстановление").length).toBeGreaterThan(0);
    expect(screen.getByText("служебная почта")).toBeInTheDocument();
    expect(screen.getByText("почта вне домена")).toBeInTheDocument();
    expect(screen.getAllByText("Признаки").length).toBeGreaterThan(0);
    expect(document.body).not.toHaveTextContent("Email");
    expect(document.body).not.toHaveTextContent("внешняя почта");
    expect(document.body).not.toHaveTextContent("внешний email");
    expect(document.body).not.toHaveTextContent("служебные email");
  });

  it("keeps short account and risk labels on one readable badge line", () => {
    render(<AdminUsersPage users={users} />);

    for (const label of ["пароль не задан", "нет пароля", "служебная telegram-почта", "служебная почта", "почтовое восстановление"]) {
      for (const element of screen.getAllByText(label)) {
        expect(element).toHaveClass("whitespace-nowrap");
      }
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

  it("makes the first-column username itself a visible detail link", () => {
    render(<AdminUsersPage users={users} />);

    expect(screen.getByRole("link", { name: "teanore" })).toHaveAttribute("href", "/admin/users/u-1");
    expect(screen.getByRole("link", { name: "owner" })).toHaveAttribute("href", "/admin/users/u-2");
  });

  it("keeps all-filter options first in every dropdown", () => {
    render(<AdminUsersPage users={users} />);

    expect(within(screen.getByLabelText("Роль")).getAllByRole("option")[0]).toHaveTextContent("Все роли");
    expect(within(screen.getByLabelText("Доступ")).getAllByRole("option")[0]).toHaveTextContent("Все доступы");
    expect(within(screen.getByLabelText("Состояние")).getAllByRole("option")[0]).toHaveTextContent("Все состояния");
    expect(within(screen.getByLabelText("Восстановление")).getAllByRole("option")[0]).toHaveTextContent("Все восстановления");
    expect(within(screen.getByLabelText("Признаки")).getAllByRole("option")[0]).toHaveTextContent("Все признаки");
  });

  it("filters users by search text, access, recovery and risk state", () => {
    render(<AdminUsersPage users={users} />);

    fireEvent.change(screen.getByLabelText("Поиск"), { target: { value: "mod_nof" } });
    expect(screen.getByRole("link", { name: "moderator" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "teanore" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Поиск"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Доступ"), { target: { value: "telegram-only" } });
    expect(screen.getByRole("link", { name: "teanore" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "owner" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Доступ"), { target: { value: "all" } });
    fireEvent.change(screen.getByLabelText("Состояние"), { target: { value: "denied" } });
    expect(screen.getByRole("link", { name: "owner" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "teanore" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Состояние"), { target: { value: "all" } });
    fireEvent.change(screen.getByLabelText("Восстановление"), { target: { value: "service-email" } });
    expect(screen.getByRole("link", { name: "teanore" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "moderator" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Восстановление"), { target: { value: "all" } });
    fireEvent.change(screen.getByLabelText("Признаки"), { target: { value: "no-risks" } });
    expect(screen.getByRole("link", { name: "moderator" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "owner" })).not.toBeInTheDocument();
  });

  it("shows a concise empty state when filters hide all users", () => {
    render(<AdminUsersPage users={users} />);

    fireEvent.change(screen.getByLabelText("Поиск"), { target: { value: "nobody@example.com" } });

    expect(screen.getByText("Показано: 0 из 3")).toBeInTheDocument();
    expect(screen.getByText("Пользователи по выбранным фильтрам не найдены.")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("runbook");
  });
});
