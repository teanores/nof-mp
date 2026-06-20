import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { AdminEventsPage } from "@/components/AdminEventsPage";

describe("admin events page", () => {
  it("shows sanitized account and admin events", () => {
    render(
      <AdminEventsPage
        events={[
          {
            activityLabel: "Администратор отправил восстановление",
            actorLabel: "Пользователь: admin",
            createdAt: "2026-06-20T08:30:00.000Z",
            id: "event-1",
            method: "POST",
            path: "/api/admin/users/u-1/password-reset",
            statusCode: 200,
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Журнал событий" })).toBeInTheDocument();
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
});
