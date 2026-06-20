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
];

describe("admin events page", () => {
  it("shows sanitized account and admin events", () => {
    render(
      <AdminEventsPage events={events} />,
    );

    expect(screen.getByRole("heading", { name: "Журнал событий" })).toBeInTheDocument();
    expect(screen.getByLabelText("Тип события")).toHaveDisplayValue("Все события");
    expect(screen.getByText("Пользователь: admin")).toBeInTheDocument();
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
});
