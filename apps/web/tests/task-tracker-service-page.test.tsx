import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import TaskTrackerServicePage from "@/app/services/task-tracker/page";
import HabitTrackerServicePage from "@/app/services/habit-tracker/page";
import StreamerServicePage from "@/app/services/streamer/page";
import { NOF_MP_FOOTER_MARKER } from "@/lib/platform-version";

describe("service preview pages", () => {
  it("shows an explicit Task Tracker entry button without auto redirecting the preview page", () => {
    render(<TaskTrackerServicePage />);

    expect(screen.getByRole("heading", { name: "Task Tracker" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Перейти в Task Tracker" })).toHaveAttribute(
      "href",
      "https://task-tracker.forgath.ru/auth/platform/start?next=%2Fprojects",
    );
    expect(screen.getByRole("link", { name: "К разделам кузницы" })).toHaveAttribute("href", "/overview");
    expect(screen.getByText(NOF_MP_FOOTER_MARKER)).toBeInTheDocument();
  });

  it("keeps Habit Tracker launch closed until the NOF Platform identity flow is ready", () => {
    render(<HabitTrackerServicePage />);

    expect(screen.getByRole("heading", { name: "Habit Tracker" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Перейти в Habit Tracker" })).not.toBeInTheDocument();
    expect(screen.getByText(/Прямой переход закрыт/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "К разделам кузницы" })).toHaveAttribute("href", "/overview");
    expect(screen.getByText(NOF_MP_FOOTER_MARKER)).toBeInTheDocument();
  });

  it("keeps streamer preview as a coming-soon page without a broken open button", () => {
    render(<StreamerServicePage />);

    expect(screen.getByRole("heading", { name: "Портал стримера" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Перейти/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "К разделам кузницы" })).toHaveAttribute("href", "/overview");
    expect(screen.getByText(NOF_MP_FOOTER_MARKER)).toBeInTheDocument();
  });
});
