import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { AdminHomePage } from "@/components/AdminHomePage";
import type { ForgePortalSession } from "@/lib/types";

const adminSession: ForgePortalSession = {
  authenticated: true,
  loginUrl: "/login",
  user: {
    experience: 0,
    id: "admin-1",
    role: { displayName: "Администратор", id: 1, name: "admin" },
    username: "teanore",
  },
};

describe("admin home page", () => {
  it("renders a Russian admin section without internal infrastructure text", () => {
    render(<AdminHomePage session={adminSession} />);

    expect(screen.getByRole("heading", { name: "Администрирование" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Пользователи/ })).toHaveAttribute("href", "/admin/users");
    expect(screen.getByRole("link", { name: /Безопасность/ })).toHaveAttribute("href", "/admin/security");
    expect(screen.getByText("Администратор")).toBeInTheDocument();
    expect(screen.getByText(/Вход разрешён только владельцу и администраторам платформы/i)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("192.168.1.51");
    expect(document.body).not.toHaveTextContent("30500");
    expect(document.body).not.toHaveTextContent("forge_tasks");
    expect(document.body).not.toHaveTextContent("dragon-forge-service");
    expect(document.body).not.toHaveTextContent("secret");
  });
});
