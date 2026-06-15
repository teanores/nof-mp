import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it } from "vitest";

import { AdminSecretsPage } from "@/components/AdminSecretsPage";
import type { SecretRotationRegistryItem } from "@/lib/server/secret-rotation-registry";

const registry: SecretRotationRegistryItem[] = [
  {
    consumers: ["nof-mp password reset"],
    daysUntilRotation: 17,
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret nof-mp-email-secrets",
    nextRotationDueAt: "2026-07-01",
    nextReviewAt: "2026-07-01",
    owner: "nof-mp",
    purpose: "Password reset email delivery token",
    riskLevel: "P0",
    rotationPeriodDays: 30,
    rotationStatus: "needs-rotation",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "NOF_MP_EMAIL_WEBHOOK_TOKEN",
    serviceKey: "nof-mp",
    source: "manual",
    uatStatus: "pending",
  },
  {
    consumers: ["nof-ht habit/product Telegram webhook"],
    daysUntilRotation: 17,
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret nof-ht-habit-bot-secrets",
    nextRotationDueAt: "2026-07-01",
    nextReviewAt: "2026-07-01",
    owner: "nof-ht",
    purpose: "Telegram token for @naragothal_bot product/community integration",
    riskLevel: "P0",
    rotationPeriodDays: 30,
    rotationStatus: "planned",
    runbookSlug: "td-12-split-bots-plan",
    secretName: "TELEGRAM_HABIT_BOT_TOKEN",
    serviceKey: "nof-ht",
    source: "manual",
    uatStatus: "pending",
  },
  {
    consumers: ["nof-tt database access"],
    daysUntilRotation: null,
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret postgres-secret",
    nextRotationDueAt: null,
    nextReviewAt: "2026-07-01",
    owner: "nof-infra / database / nof-tt",
    purpose: "PostgreSQL runtime role password for Task Tracker data access",
    riskLevel: "P0",
    rotationPeriodDays: null,
    rotationStatus: "hold",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "DB_PASS",
    serviceKey: "nof-tt",
    source: "manual",
    uatStatus: "blocked",
  },
];

describe("admin secrets page", () => {
  it("renders secret rotation metadata without secret values", () => {
    render(<AdminSecretsPage registry={registry} />);

    expect(screen.getByRole("heading", { name: "Ротация секретов" })).toBeInTheDocument();
    expect(screen.getByText("NOF_MP_EMAIL_WEBHOOK_TOKEN")).toBeInTheDocument();
    expect(screen.getByText("TELEGRAM_HABIT_BOT_TOKEN")).toBeInTheDocument();
    expect(screen.getAllByText("nof-mp").length).toBeGreaterThan(0);
    expect(screen.getByText("Требует ротации")).toBeInTheDocument();
    expect(screen.getAllByText("manual").length).toBeGreaterThan(0);
    expect(screen.getAllByText("01.07.2026").length).toBeGreaterThan(0);
    expect(screen.getAllByText("17 дн.").length).toBeGreaterThan(0);
    expect(screen.getByText("Kubernetes Secret nof-mp-email-secrets")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("SMTP_PASS=");
    expect(document.body).not.toHaveTextContent("Bearer ");
    expect(document.body).not.toHaveTextContent("token value");
    expect(document.body).not.toHaveTextContent("smtp-pass");
    expect(screen.getByText("Как читать")).toBeInTheDocument();
    expect(screen.getByText("Безопасность")).toBeInTheDocument();
    expect(screen.getByText("Что делать")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("Rule");
    expect(document.body).not.toHaveTextContent("Runbook");
  });

  it("filters secrets by service and category", async () => {
    const user = userEvent.setup();
    render(<AdminSecretsPage registry={registry} />);

    const serviceOptions = screen.getAllByRole("option", { name: /Все сервисы|nof-/ });
    expect(serviceOptions[0]).toHaveTextContent("Все сервисы");
    const categoryOptions = screen.getAllByRole("option", { name: /Все типы|Боты|БД|Email/ });
    expect(categoryOptions[0]).toHaveTextContent("Все типы");

    await user.selectOptions(screen.getByLabelText("Фильтр по сервису"), "nof-ht");

    expect(screen.getByText("TELEGRAM_HABIT_BOT_TOKEN")).toBeInTheDocument();
    expect(screen.queryByText("NOF_MP_EMAIL_WEBHOOK_TOKEN")).not.toBeInTheDocument();
    expect(screen.queryByText("DB_PASS")).not.toBeInTheDocument();
    expect(screen.getByText("Показано 1 из 3.")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Фильтр по сервису"), "all");
    await user.selectOptions(screen.getByLabelText("Фильтр по типу"), "bot");

    expect(screen.getByText("TELEGRAM_HABIT_BOT_TOKEN")).toBeInTheDocument();
    expect(screen.queryByText("NOF_MP_EMAIL_WEBHOOK_TOKEN")).not.toBeInTheDocument();
    expect(screen.queryByText("DB_PASS")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Фильтр по типу"), "database");

    expect(screen.getByText("DB_PASS")).toBeInTheDocument();
    expect(screen.queryByText("TELEGRAM_HABIT_BOT_TOKEN")).not.toBeInTheDocument();
  });
});
