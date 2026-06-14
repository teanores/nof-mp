import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { AdminSecretsPage } from "@/components/AdminSecretsPage";
import type { SecretRotationRegistryItem } from "@/lib/server/secret-rotation-registry";

const registry: SecretRotationRegistryItem[] = [
  {
    consumers: ["nof-mp password reset"],
    lastRotatedAt: null,
    locationClass: "Kubernetes Secret nof-mp-email-secrets",
    nextReviewAt: "2026-07-01",
    owner: "nof-mp",
    purpose: "Password reset email delivery token",
    riskLevel: "P0",
    rotationStatus: "needs-rotation",
    runbookSlug: "nof-mp-secret-rotation-incident-runbook-2026-06-14",
    secretName: "NOF_MP_EMAIL_WEBHOOK_TOKEN",
    serviceKey: "nof-mp",
    uatStatus: "pending",
  },
];

describe("admin secrets page", () => {
  it("renders secret rotation metadata without secret values", () => {
    render(<AdminSecretsPage registry={registry} />);

    expect(screen.getByRole("heading", { name: "Ротация секретов" })).toBeInTheDocument();
    expect(screen.getByText("NOF_MP_EMAIL_WEBHOOK_TOKEN")).toBeInTheDocument();
    expect(screen.getByText("nof-mp")).toBeInTheDocument();
    expect(screen.getByText("Требует ротации")).toBeInTheDocument();
    expect(screen.getByText("Kubernetes Secret nof-mp-email-secrets")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("SMTP_PASS=");
    expect(document.body).not.toHaveTextContent("Bearer ");
    expect(document.body).not.toHaveTextContent("token value");
    expect(document.body).not.toHaveTextContent("smtp-pass");
  });
});
