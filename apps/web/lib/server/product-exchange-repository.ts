import { randomUUID } from "crypto";

export interface IssueProductExchangeInput {
  platformUserId: string;
  productKey: string;
  returnTo: string;
  state: string;
  ttlSeconds: number;
}

export interface ProductExchangeRecord extends IssueProductExchangeInput {
  code: string;
  expiresAt: string;
  usedAt?: string;
}

export type RedeemProductExchangeResult =
  | { ok: true; record: ProductExchangeRecord }
  | { ok: false; error: "not_found" | "expired" | "already_used" | "product_mismatch" | "state_mismatch" };

export class InMemoryProductExchangeRepository {
  private readonly records = new Map<string, ProductExchangeRecord>();

  async issue(input: IssueProductExchangeInput): Promise<ProductExchangeRecord> {
    const code = `px_${randomUUID().replaceAll("-", "")}`;
    const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000).toISOString();
    const record: ProductExchangeRecord = { ...input, code, expiresAt };
    this.records.set(code, record);
    return record;
  }

  async redeem(input: { code: string; productKey: string; state: string }): Promise<RedeemProductExchangeResult> {
    const record = this.records.get(input.code);
    if (!record) {
      return { ok: false, error: "not_found" };
    }
    if (record.usedAt) {
      return { ok: false, error: "already_used" };
    }
    if (record.productKey !== input.productKey) {
      return { ok: false, error: "product_mismatch" };
    }
    if (record.state !== input.state) {
      return { ok: false, error: "state_mismatch" };
    }
    if (Date.parse(record.expiresAt) <= Date.now()) {
      return { ok: false, error: "expired" };
    }

    record.usedAt = new Date().toISOString();
    return { ok: true, record };
  }
}

let repository: InMemoryProductExchangeRepository | undefined;

export function getProductExchangeRepository(): InMemoryProductExchangeRepository {
  repository ??= new InMemoryProductExchangeRepository();
  return repository;
}
