import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it } from "vitest";

import { AdminEventsPage } from "@/components/AdminEventsPage";

const events = [
  {
    activityLabel: "Администратор отправил восстановление",
    actorLabel: "Пользователь: admin",
    createdAt: "2026-06-20T08:30:00.000Z",
    id: "event-1",
    method: "POST",
    path: "/api/admin/users/u-1/password-reset",
    statusCode: 200,
  },
  {
    activityLabel: "Отключение связи сервиса",
    actorLabel: "Пользователь: owner",
    createdAt: "2026-06-20T08:31:00.000Z",
    id: "event-2",
    method: "DELETE",
    path: "/api/profile/service-links?serviceKey=nof-ht",
    statusCode: 200,
  },
  {
    activityLabel: "Выход из аккаунта",
    actorLabel: "Пользователь: owner",
    createdAt: "2026-06-20T08:32:00.000Z",
    id: "event-3",
    method: "POST",
    path: "/api/logout",
    statusCode: 303,
  },
  {
    activityLabel: "Удаление пользователя",
    actorLabel: "Пользователь: admin",
    createdAt: "2026-06-20T08:33:00.000Z",
    id: "event-4",
    method: "DELETE",
    path: "/api/admin/users/u-2/delete",
    statusCode: 200,
  },
  {
    activityLabel: "Слияние учётных записей",
    actorLabel: "Пользователь: admin",
    createdAt: "2026-06-20T08:34:00.000Z",
    id: "event-5",
    method: "POST",
    path: "/api/admin/users/u-2/merge",
    statusCode: 200,
  },
  {
    activityLabel: "Изменение email и Telegram",
    actorLabel: "Пользователь: admin",
    createdAt: "2026-06-20T08:35:00.000Z",
    id: "event-6",
    method: "POST",
    path: "/api/admin/users/u-2/identity-link",
    statusCode: 200,
  },
  {
    activityLabel: "Администратор потребовал смену пароля",
    actorLabel: "Пользователь: admin",
    createdAt: "2026-06-20T08:36:00.000Z",
    id: "event-7",
    method: "POST",
    path: "/api/admin/users/u-2/password-rotation",
    statusCode: 200,
  },
];

describe("admin events page", () => {
  it("shows sanitized account and admin events", () => {
    render(
      <AdminEventsPage events={events} />,
    );

    expect(screen.getByRole("heading", { name: "Журнал событий" })).toBeInTheDocument();
    expect(screen.getByLabelText("Тип события")).toHaveDisplayValue("Все события");
    expect(screen.getAllByText("Пользователь: admin").length).toBeGreaterThan(0);
    expect(screen.getByText("Администратор отправил восстановление")).toBeInTheDocument();
    expect(screen.getByText("/api/admin/users/u-1/password-reset")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("password=");
    expect(document.body).not.toHaveTextContent("Bearer");
    expect(document.body).not.toHaveTextContent("token");
    expect(document.body).not.toHaveTextContent("secret");
    expect(document.body).not.toHaveTextContent("192.168.1.51");
  });

  it("shows concise empty state", () => {
    render(<AdminEventsPage events={[]} />);

    expect(screen.getByText("Событий аккаунтов пока нет.")).toBeInTheDocument();
  });

  it("filters events by type and search text", async () => {
    render(<AdminEventsPage events={events} />);

    await userEvent.selectOptions(screen.getByLabelText("Тип события"), "Отключение связи сервиса");

    expect(screen.queryByText("Администратор отправил восстановление")).not.toBeInTheDocument();
    expect(screen.getByText("Отключение связи сервиса")).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("Поиск"));
    await userEvent.type(screen.getByLabelText("Поиск"), "missing");

    expect(screen.getByText("По выбранным фильтрам событий не найдено.")).toBeInTheDocument();
  });

  it("includes logout events in the type filter", async () => {
    render(<AdminEventsPage events={events} />);

    await userEvent.selectOptions(screen.getByLabelText("Тип события"), "Выход");

    expect(screen.getByText("Выход из аккаунта")).toBeInTheDocument();
    expect(screen.queryByText("Отключение связи сервиса")).not.toBeInTheDocument();
    expect(screen.queryByText("Администратор отправил восстановление")).not.toBeInTheDocument();
  });

  it("filters user lifecycle admin actions as one category", async () => {
    render(<AdminEventsPage events={events} />);

    await userEvent.selectOptions(screen.getByLabelText("Тип события"), "Управление пользователями");

    expect(screen.getByText("Удаление пользователя")).toBeInTheDocument();
    expect(screen.getByText("Слияние учётных записей")).toBeInTheDocument();
    expect(screen.getByText("Изменение email и Telegram")).toBeInTheDocument();
    expect(screen.getByText("Администратор потребовал смену пароля")).toBeInTheDocument();
    expect(screen.queryByText("Выход из аккаунта")).not.toBeInTheDocument();
  });
});
