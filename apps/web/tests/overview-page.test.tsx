import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import OverviewPage from "@/app/overview/page";

const auth = vi.hoisted(() => ({
  sessionFromCookie: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: "session-token" }),
  }),
}));

vi.mock("@/lib/server/dragon-forge-auth", () => ({
  dragonForgeAuthCookieName: "auth_token",
  getDragonForgeAuthRepository: () => auth,
}));

vi.mock("@/lib/platform-api", () => ({
  fetchPortalSession: vi.fn(),
}));

describe("platform overview page", () => {
  beforeEach(() => {
    auth.sessionFromCookie.mockResolvedValue({
      authenticated: true,
      loginUrl: "/login",
      user: { experience: 0, id: "u-1", role: { id: 1, name: "admin" }, username: "teanore" },
    });
  });

  it("renders the platform overview and a single admin entry for admins", async () => {
    render(await OverviewPage());

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

  it("hides admin cards for moderators", async () => {
    auth.sessionFromCookie.mockResolvedValue({
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
