import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import TaskTrackerServicePage from "@/app/services/task-tracker/page";
import HabitTrackerServicePage from "@/app/services/habit-tracker/page";
import StreamerServicePage from "@/app/services/streamer/page";
import { NOF_MP_FOOTER_MARKER } from "@/lib/platform-version";

describe("service preview pages", () => {
  it("shows an explicit Task Tracker entry button without auto redirecting the preview page", () => {
    const { container } = render(<TaskTrackerServicePage />);

    expect(screen.getByRole("heading", { name: "Task Tracker" })).toBeInTheDocument();
    expect(container.querySelector(".max-w-\\[1200px\\]")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Перейти в Task Tracker" })).toHaveAttribute(
      "href",
      "/products/nof-tt/launch",
    );
    expect(screen.getByText(/собирает идеи, требования, задачи, спринты и UAT/i)).toBeInTheDocument();
    expect(screen.getByText(/руководителя продукта/i)).toBeInTheDocument();
    expect(screen.getByText(/экономит время команды/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "К разделам кузницы" })).toHaveAttribute("href", "/overview");
    expect(screen.getByText(NOF_MP_FOOTER_MARKER)).toBeInTheDocument();
  });

  it("shows Habit Tracker context and restores the product launch button", () => {
    const { container } = render(<HabitTrackerServicePage />);

    expect(screen.getByRole("heading", { name: "Habit Tracker" })).toBeInTheDocument();
    expect(container.querySelector(".max-w-\\[1200px\\]")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Перейти в Habit Tracker" })).toHaveAttribute(
      "href",
      "/products/nof-ht/launch",
    );
    expect(screen.getByText(/помогает удерживать регулярные практики/i)).toBeInTheDocument();
    expect(screen.getByText(/личных целей и командных ритуалов/i)).toBeInTheDocument();
    expect(screen.getByText(/ценность видна каждый день/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "К разделам кузницы" })).toHaveAttribute("href", "/overview");
    expect(screen.getByText(NOF_MP_FOOTER_MARKER)).toBeInTheDocument();
  });

  it("keeps streamer preview as a coming-soon page without a broken open button", () => {
    const { container } = render(<StreamerServicePage />);

    expect(screen.getByRole("heading", { name: "Портал стримера" })).toBeInTheDocument();
    expect(container.querySelector(".max-w-\\[1200px\\]")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Перейти/ })).not.toBeInTheDocument();
    expect(screen.getByText(/собирает подготовку эфиров/i)).toBeInTheDocument();
    expect(screen.getByText(/планирование стримов/i)).toBeInTheDocument();
    expect(screen.getByText(/Будущая автоматизация/i)).toBeInTheDocument();
    expect(screen.getByText(/рабочим кабинетом для автора/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "К разделам кузницы" })).toHaveAttribute("href", "/overview");
    expect(screen.getByText(NOF_MP_FOOTER_MARKER)).toBeInTheDocument();
  });
});
