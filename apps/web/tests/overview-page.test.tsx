import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import OverviewPage from "@/app/overview/page";

describe("platform overview page", () => {
  it("renders the platform overview instead of redirecting to the landing page", () => {
    render(<OverviewPage />);

    expect(screen.getByRole("heading", { name: "Narag'Othal Forgath" })).toBeInTheDocument();
    expect(screen.getByText("Forge Tasks")).toBeInTheDocument();
    expect(screen.getByText("Habit Tracker")).toBeInTheDocument();
    expect(screen.getByText("Портал стримера")).toBeInTheDocument();
  });
});
