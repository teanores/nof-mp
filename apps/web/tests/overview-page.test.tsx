import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import OverviewPage from "@/app/overview/page";
import { legacyPortalLanguageStorageKey, portalLanguageStorageKey } from "@/lib/portal-language";

const mocks = vi.hoisted(() => ({
  requirePortalPageSession: vi.fn(),
}));

vi.mock("@/lib/server/portal-auth-gate", () => ({
  requirePortalPageSession: mocks.requirePortalPageSession,
}));

vi.mock("@/lib/platform-api", () => ({
  fetchPortalSession: vi.fn(),
}));

describe("platform overview page", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.requirePortalPageSession.mockResolvedValue({
      authenticated: true,
      loginUrl: "/login",
      user: { experience: 0, id: "u-1", role: { id: 1, name: "admin" }, username: "teanore" },
    });
  });

  it("renders the platform overview and a single admin entry for admins", async () => {
    render(await OverviewPage());

    expect(mocks.requirePortalPageSession).toHaveBeenCalledWith("/overview");
    expect(screen.getByRole("heading", { name: "Narag'Othal Forgath" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Task Tracker" })).toBeInTheDocument();
    expect(screen.getByText("Habit Tracker")).toBeInTheDocument();
    expect(screen.getByText("Портал стримера")).toBeInTheDocument();
    expect(screen.getByText("Задачи")).toBeInTheDocument();
    expect(screen.getByText("Привычки")).toBeInTheDocument();
    expect(screen.getByText("Стримы")).toBeInTheDocument();
    expect(screen.queryByText("tracker")).not.toBeInTheDocument();
    expect(screen.queryByText("habits")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Администрирование/ })).toHaveAttribute("href", "/admin");
    const links = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(links).not.toContain("/admin/security");
    expect(links).not.toContain("/admin/users");
    expect(screen.getByRole("link", { name: "Профиль teanore" })).toHaveTextContent("TE");
    expect(screen.queryByRole("link", { name: "Профиль" })).not.toBeInTheDocument();
  });

  it("keeps overview labels and module statuses in English when English is selected", async () => {
    window.localStorage.setItem(portalLanguageStorageKey, "en");

    render(await OverviewPage());

    expect(await screen.findByText("Platform Services")).toBeInTheDocument();
    expect(screen.getByText("Platform Sections")).toBeInTheDocument();
    expect(screen.getByText("Service Status")).toBeInTheDocument();
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("Habits")).toBeInTheDocument();
    expect(screen.getByText("Streams")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText("Preview")).toBeInTheDocument();
    expect(screen.getByText("Planned")).toBeInTheDocument();
    expect(screen.getByText("Streamer Portal")).toBeInTheDocument();
    expect(screen.getByText("Public address")).toBeInTheDocument();
    expect(screen.queryByText("Разделы кузницы")).not.toBeInTheDocument();
    expect(screen.queryByText("Статус сервисов")).not.toBeInTheDocument();
  });

  it("migrates the legacy browser language key to the platform key", async () => {
    window.localStorage.setItem(legacyPortalLanguageStorageKey, "en");

    render(await OverviewPage());

    expect(await screen.findByText("Platform Services")).toBeInTheDocument();
    expect(window.localStorage.getItem(portalLanguageStorageKey)).toBe("en");
    expect(window.localStorage.getItem(legacyPortalLanguageStorageKey)).toBeNull();
  });

  it("hides admin cards for moderators", async () => {
    mocks.requirePortalPageSession.mockResolvedValue({
      authenticated: true,
      loginUrl: "/login",
      user: { experience: 0, id: "u-2", role: { id: 2, name: "moderator" }, username: "moderator" },
    });

    render(await OverviewPage());

    expect(screen.getByRole("heading", { name: "Narag'Othal Forgath" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Запросы/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Пользователи/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Администрирование")).not.toBeInTheDocument();
  });
});
