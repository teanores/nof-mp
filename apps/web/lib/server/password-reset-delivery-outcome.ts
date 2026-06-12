type PasswordResetDeliveryOutcome = "delivered" | "failed" | "not_configured" | "not_requested";

export function recordPasswordResetDeliveryOutcome(input: { outcome: PasswordResetDeliveryOutcome; userId?: string }): void {
  const event = {
    event: "password_reset_delivery",
    outcome: input.outcome,
    userId: input.userId,
  };

  if (input.outcome === "failed") {
    console.warn("NOF password reset delivery failed", event);
    return;
  }

  console.info("NOF password reset delivery outcome", event);
}
