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
    user: { experience: 0, id: "u-1", username: "teanore" },
    });
  });

  it("renders the platform overview instead of redirecting to the landing page", async () => {
    render(await OverviewPage());

    expect(screen.getByRole("heading", { name: "Narag'Othal Forgath" })).toBeInTheDocument();
    expect(screen.getByText("Forge Tasks")).toBeInTheDocument();
    expect(screen.getByText("Habit Tracker")).toBeInTheDocument();
    expect(screen.getByText("Портал стримера")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Запросы/ })).toHaveAttribute("href", "/admin/security");
    expect(screen.getByRole("link", { name: /Пользователи/ })).toHaveAttribute("href", "/admin/users");
    expect(screen.getByRole("link", { name: "Профиль teanore" })).toHaveTextContent("TE");
    expect(screen.queryByRole("link", { name: "Профиль" })).not.toBeInTheDocument();
  });
});
