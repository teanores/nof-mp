import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import ForgeTasksServicePage from "@/app/services/forge-tasks/page";
import HabitTrackerServicePage from "@/app/services/habit-tracker/page";
import StreamerServicePage from "@/app/services/streamer/page";

describe("service preview pages", () => {
  it("shows an explicit Forge Tasks entry button without auto redirecting the preview page", () => {
    render(<ForgeTasksServicePage />);

    expect(screen.getByRole("heading", { name: "Forge Tasks" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Перейти в Forge Tasks" })).toHaveAttribute(
      "href",
      "/products/nof-tt/launch?next=%2Foverview",
    );
    expect(screen.getByRole("link", { name: "К разделам кузницы" })).toHaveAttribute("href", "/overview");
    expect(screen.getByText("NOF.MP // v0.1.11")).toBeInTheDocument();
  });

  it("shows Habit Tracker as an external service entry with the standard shell", () => {
    render(<HabitTrackerServicePage />);

    expect(screen.getByRole("heading", { name: "Habit Tracker" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Перейти в Habit Tracker" })).toHaveAttribute(
      "href",
      "https://habit-tracker.forgath.ru",
    );
    expect(screen.getByRole("link", { name: "К разделам кузницы" })).toHaveAttribute("href", "/overview");
    expect(screen.getByText("NOF.MP // v0.1.11")).toBeInTheDocument();
  });

  it("keeps streamer preview as a coming-soon page without a broken open button", () => {
    render(<StreamerServicePage />);

    expect(screen.getByRole("heading", { name: "Портал стримера" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Перейти/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "К разделам кузницы" })).toHaveAttribute("href", "/overview");
    expect(screen.getByText("NOF.MP // v0.1.11")).toBeInTheDocument();
  });
});
