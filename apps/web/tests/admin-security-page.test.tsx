import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { AdminSecurityPage } from "@/components/AdminSecurityPage";
import { NOF_MP_FOOTER_MARKER } from "@/lib/platform-version";
import type { SecurityAuditDashboard } from "@/lib/server/security-audit-dashboard";

const dashboard: SecurityAuditDashboard = {
  generatedAt: "2026-06-03T20:40:00.000Z",
  recentEvents: [
    {
      activityLabel: "Неудачный вход",
      actorLabel: "Логин: a***n@forgath.ru",
      classification: "auth",
      createdAt: "2026-06-03T20:39:00.000Z",
      id: "event-1",
      ip: "203.0.113.10",
      method: "POST",
      path: "/api/login",
      statusCode: 401,
      userAgent: "curl",
    },
    {
      activityLabel: "MCP-запрос",
      actorLabel: "MCP agent client",
      classification: "normal",
      createdAt: "2026-06-03T20:38:00.000Z",
      id: "event-2",
      ip: "198.51.100.42",
      method: "POST",
      path: "/api/mcp",
      statusCode: 200,
      userAgent: "claude-code/2.1.161 (cli)",
    },
    {
      activityLabel: "Проверка служебного файла",
      actorLabel: "Поисковый робот",
      classification: "normal",
      createdAt: "2026-06-03T20:37:00.000Z",
      id: "event-3",
      ip: "203.0.113.99",
      method: "GET",
      path: "/robots.txt",
      statusCode: 200,
      userAgent: "bot",
    },
  ],
  recommendation: "Проверить пользователя",
  summary: {
    failedLogins: 1,
    forbidden: 0,
    notFound: 0,
    rateLimited: 0,
    successfulLogins: 0,
    suspiciousScans: 0,
  },
  topPaths: [
    { count: 1, path: "/api/login" },
    { count: 1, path: "/api/mcp" },
    { count: 1, path: "/robots.txt" },
  ],
  topSources: [
    { failedLogins: 1, ip: "203.0.113.10", scans: 0, total: 1 },
    { failedLogins: 0, ip: "198.51.100.42", scans: 0, total: 1 },
    { failedLogins: 0, ip: "203.0.113.99", scans: 0, total: 1 },
  ],
};

describe("admin security page", () => {
  it("uses the platform shell and footer instead of a product shell", () => {
    render(
      <AdminSecurityPage
        dashboard={dashboard}
        session={{
          authenticated: true,
          loginUrl: "/login",
          user: {
            experience: 0,
            id: "admin-1",
            role: { id: 1, name: "admin" },
            username: "teanore",
          },
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Безопасность платформы" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Проверить пользователя" })).toBeInTheDocument();
    expect(screen.getByText("Неудачные входы")).toBeInTheDocument();
    expect(screen.getByText("Логин: a***n@forgath.ru")).toBeInTheDocument();
    expect(screen.getByText("Неудачный вход")).toBeInTheDocument();
    expect(screen.getByText("MCP agent client")).toBeInTheDocument();
    expect(screen.getByText("MCP-запрос")).toBeInTheDocument();
    expect(screen.getByText("Поисковый робот")).toBeInTheDocument();
    expect(screen.getByText("Проверка служебного файла")).toBeInTheDocument();
    expect(screen.getAllByText("203.0.113.10")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Профиль teanore" })).toHaveAttribute("href", "/profile");
    expect(screen.getByRole("link", { name: "Профиль teanore" })).toHaveTextContent("TE");
    expect(screen.getByText(NOF_MP_FOOTER_MARKER)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("NOF.TT");
    expect(document.body).not.toHaveTextContent("192.168.1.51");
    expect(document.body).not.toHaveTextContent("30500");
    expect(document.body).not.toHaveTextContent("30510");
    expect(document.body).not.toHaveTextContent("token");
    expect(document.body).not.toHaveTextContent("password");
  });
});
