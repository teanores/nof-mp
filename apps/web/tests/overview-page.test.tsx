import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import OverviewPage from "@/app/overview/page";

vi.mock("@/lib/platform-api", () => ({
  fetchPortalSession: vi.fn().mockResolvedValue({
    authenticated: true,
    loginUrl: "/login",
    user: { experience: 0, id: "u-1", username: "teanore" },
  }),
}));

describe("platform overview page", () => {
  it("renders the platform overview instead of redirecting to the landing page", async () => {
    render(<OverviewPage />);

    expect(screen.getByRole("heading", { name: "Narag'Othal Forgath" })).toBeInTheDocument();
    expect(screen.getByText("Forge Tasks")).toBeInTheDocument();
    expect(screen.getByText("Habit Tracker")).toBeInTheDocument();
    expect(screen.getByText("Портал стримера")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Запросы/ })).toHaveAttribute("href", "/admin/security");
    expect(screen.getByRole("link", { name: /Пользователи/ })).toHaveAttribute("href", "/admin/users");
    expect(await screen.findByRole("link", { name: "Профиль teanore" })).toHaveTextContent("TE");
  });
});
