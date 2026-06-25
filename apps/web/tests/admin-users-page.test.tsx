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
    telegram: { id: 614815689, username: "mod_nof" },
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
    expect(screen.queryByText("Открыть")).not.toBeInTheDocument();
  });

  it("uses Russian fallback text for unknown registration source", () => {
    render(<AdminUsersPage users={users} />);

    expect(screen.getByText("источник неизвестен")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("source unknown");
    expect(document.body).not.toHaveTextContent("telegram email");
  });

  it("opens account detail from the username without a redundant action column", () => {
    render(<AdminUsersPage users={users} />);

    expect(screen.queryByText("Действия")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "teanore" })).toHaveAttribute("href", "/admin/users/u-1");
    expect(screen.getByRole("link", { name: "owner" })).toHaveAttribute("href", "/admin/users/u-2");
  });

  it("keeps Telegram id and username visible as separate fields", () => {
    render(<AdminUsersPage users={users} />);

    const teanoreRow = screen.getByRole("link", { name: "teanore" }).closest("tr");
    expect(teanoreRow).not.toBeNull();
    expect(within(teanoreRow as HTMLElement).getByText("ID: 251740038")).toBeInTheDocument();
    expect(within(teanoreRow as HTMLElement).getByText("Username: @teanore")).toBeInTheDocument();

    const moderatorRow = screen.getByRole("link", { name: "moderator" }).closest("tr");
    expect(moderatorRow).not.toBeNull();
    expect(within(moderatorRow as HTMLElement).getByText("ID: 614815689")).toBeInTheDocument();
    expect(within(moderatorRow as HTMLElement).getByText("Username: @mod_nof")).toBeInTheDocument();
  });

  it("keeps all-filter options first in every dropdown", () => {
    render(<AdminUsersPage users={users} />);

    expect(within(screen.getByLabelText("Роль")).getAllByRole("option")[0]).toHaveTextContent("Все роли");
    expect(within(screen.getByLabelText("Доступ")).getAllByRole("option")[0]).toHaveTextContent("Все доступы");
    expect(within(screen.getByLabelText("Состояние")).getAllByRole("option")[0]).toHaveTextContent("Все состояния");
    expect(within(screen.getByLabelText("Восстановление")).getAllByRole("option")[0]).toHaveTextContent("Все восстановления");
    expect(within(screen.getByLabelText("Признаки")).getAllByRole("option")[0]).toHaveTextContent("Все признаки");
  });

  it("shows read-only reconciliation inventory counters without exposing service secrets", () => {
    render(<AdminUsersPage users={users} />);

    expect(screen.getByText("Сверка пользователей")).toBeInTheDocument();
    expect(screen.getByText("Реальная почта")).toBeInTheDocument();
    expect(screen.getByText("Только Telegram")).toBeInTheDocument();
    expect(screen.getAllByText("Служебная почта").length).toBeGreaterThan(0);
    expect(screen.getByText("Готовы к сверке nof-ht")).toBeInTheDocument();
    expect(screen.getAllByText("Ручная проверка").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    expect(document.body).not.toHaveTextContent("token");
    expect(document.body).not.toHaveTextContent("secret");
    expect(document.body).not.toHaveTextContent("password_hash");
  });

  it("filters users that need manual reconciliation review", () => {
    render(<AdminUsersPage users={users} />);

    fireEvent.change(screen.getByLabelText("Сверка"), { target: { value: "manual-review" } });

    expect(screen.getByRole("link", { name: "teanore" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "owner" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "moderator" })).not.toBeInTheDocument();
  });

  it("uses account merge language instead of calling related accounts duplicates", () => {
    render(<AdminUsersPage users={users} />);

    expect(screen.getByText("К объединению/dev")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("Дубли/dev");
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
