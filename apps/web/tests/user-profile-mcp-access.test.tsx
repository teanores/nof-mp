import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserProfilePage } from "@/components/UserProfilePage";
import type { ForgeMcpToken, ForgeProject } from "@/lib/types";

const platformApi = vi.hoisted(() => ({
  createMcpToken: vi.fn(),
  fetchMcpTokens: vi.fn(),
  fetchPlatformProjects: vi.fn(),
  fetchPortalSession: vi.fn(),
  revokeMcpToken: vi.fn(),
}));

vi.mock("@/lib/platform-api", () => platformApi);

const session = {
  authenticated: true,
  loginUrl: "/login",
  preferences: { language: "ru" as const },
  user: {
    createdAt: "2026-06-01T00:00:00.000Z",
    experience: 10,
    id: "user-1",
    lastSeen: "2026-06-02T00:00:00.000Z",
    username: "teanore",
  },
};

function project(overrides: Partial<ForgeProject>): ForgeProject {
  return {
    access: { allowed: false, reason: "not_granted" },
    createdAt: "2026-06-01T00:00:00.000Z",
    description: "Project",
    key: "nof-tt",
    name: "Forge Tasks",
    status: "active",
    visibility: "private",
    ...overrides,
  };
}

describe("user profile MCP access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: false,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    });
    platformApi.fetchPortalSession.mockResolvedValue(session);
    platformApi.fetchMcpTokens.mockResolvedValue([]);
    platformApi.fetchPlatformProjects.mockResolvedValue([]);
  });

  it("hides MCP setup when the user has no accessible projects and no active tokens", async () => {
    render(<UserProfilePage />);

    await screen.findByRole("heading", { name: "Профиль" });
    await waitFor(() => expect(platformApi.fetchPlatformProjects).toHaveBeenCalled());

    expect(screen.queryByText("MCP-ключи доступа")).not.toBeInTheDocument();
    expect(screen.queryByText("Доступ агентов к проектам")).not.toBeInTheDocument();
    expect(screen.queryByText("НАСТРОЙКА MCP-КЛИЕНТОВ")).not.toBeInTheDocument();
  });

  it("renders the full profile from the server session without falling back to login", async () => {
    render(<UserProfilePage initialSession={session} />);

    await screen.findByRole("heading", { name: "teanore" });

    expect(platformApi.fetchPortalSession).not.toHaveBeenCalled();
    expect(screen.getByText("Идентичность портала")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Персональные настройки" })).toBeInTheDocument();
    expect(screen.getByText("NOF.MP // v0.1.9")).toBeInTheDocument();
    expect(screen.queryByText("Требуется вход")).not.toBeInTheDocument();
    expect(screen.queryByText("Вход в платформу")).not.toBeInTheDocument();
  });

  it("uses public copy on the login-required profile fallback", async () => {
    platformApi.fetchPortalSession.mockResolvedValue({
      authenticated: false,
      loginUrl: "/login?next=%2Fprofile",
    });

    render(<UserProfilePage />);

    await screen.findByText("Вход в платформу");

    expect(screen.getByRole("link", { name: "Войти" })).toHaveAttribute("href", "/login?next=%2Fprofile");
    expect(document.body).toHaveTextContent("Войди, чтобы открыть профиль, настройки и доступные разделы платформы.");
    expect(document.body).not.toHaveTextContent("Dragon Forge");
    expect(document.body).not.toHaveTextContent("Python");
    expect(screen.getByText("NOF.MP // v0.1.9")).toBeInTheDocument();
  });

  it("shows MCP setup only for projects granted to the current user", async () => {
    platformApi.fetchPlatformProjects.mockResolvedValue([
      project({ access: { allowed: true, reason: "member" }, key: "nof-tt", name: "Forge Tasks" }),
      project({ access: { allowed: false, reason: "not_granted" }, key: "nof-mp", name: "NOF Main Platform" }),
    ]);

    render(<UserProfilePage />);

    await screen.findByText("MCP-ключи доступа");

    expect(screen.getByText("Доступ агентов к проектам")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "nof-tt - Forge Tasks" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "nof-mp - NOF Main Platform" })).not.toBeInTheDocument();
    expect(screen.getAllByText(/https:\/\/forge-tasks\.forgath\.ru\/api\/mcp/)).toHaveLength(2);
    expect(screen.getByText(/nof-tt-mcp/)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("192.168.1.51");
    expect(document.body).not.toHaveTextContent("30510");
  });

  it("keeps MCP setup visible when the user already has a real token", async () => {
    const token: ForgeMcpToken = {
      createdAt: "2026-06-01T00:00:00.000Z",
      id: "token-1",
      name: "NOF_TT_MCP_TOKEN",
      projectKey: "nof-tt",
      scopes: ["mcp"],
      tokenPrefix: "nof_tt_1234",
    };
    platformApi.fetchMcpTokens.mockResolvedValue([token]);

    render(<UserProfilePage />);

    await screen.findByText("NOF_TT_MCP_TOKEN");

    expect(screen.getByText("MCP-ключи доступа")).toBeInTheDocument();
    expect(screen.getByText("nof-tt / nof_tt_1234...")).toBeInTheDocument();
  });
});
