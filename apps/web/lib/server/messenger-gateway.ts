export type MessengerGatewayDelivery =
  | { ok: true; status: "queued" }
  | { ok: false; reason: "bot_gateway_not_configured"; status: "blocked" };

export interface MessengerGateway {
  sendEmailLink(input: { expiresAt: Date; token: string; userId: string }): Promise<MessengerGatewayDelivery>;
}

class BlockedMessengerGateway implements MessengerGateway {
  async sendEmailLink(): Promise<MessengerGatewayDelivery> {
    return { ok: false, reason: "bot_gateway_not_configured", status: "blocked" };
  }
}

const gateway = new BlockedMessengerGateway();

export function getMessengerGateway(): MessengerGateway {
  return gateway;
}
