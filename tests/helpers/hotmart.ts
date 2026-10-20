import type {
  EntitlementRow,
  HotmartRepository,
  NewEntitlement,
  WebhookEventRecord,
} from "@/lib/hotmart/process";

export const PRODUCT = "00000000-0000-4000-a000-000000000101";
export const OFFER = "abc123";
export const HOTTOK = "segredo-de-teste";

let counter = 0;

/** Payload no formato do Webhook 2.0.0 (dados fictícios). */
export function payload(
  event: string,
  opts: { id?: string; transaction?: string; email?: string; product?: string; offer?: string; createdAt?: number } = {},
) {
  counter += 1;
  return {
    id: opts.id ?? `evt-${counter}`,
    creation_date: opts.createdAt ?? 1767272400000 + counter * 1000,
    event,
    version: "2.0.0",
    data: {
      product: { id: 1000001, ucode: opts.product ?? PRODUCT, name: "Maratona de Emagrecimento de 21 Dias" },
      buyer: {
        email: opts.email ?? "  Maria.Exemplo@Example.com ",
        name: "Maria Exemplo da Silva",
        first_name: "Maria",
        ucode: "buyer-ucode-1",
        document: "00000000000",
        checkout_phone: "999990000",
        address: { city: "São Paulo", zipcode: "01000000" },
      },
      purchase: {
        transaction: opts.transaction ?? "HP0000000001",
        status: "APPROVED",
        offer: { code: opts.offer ?? OFFER },
        payment: { type: "PIX", pix_code: "000201..." },
      },
    },
  };
}

type StoredEvent = WebhookEventRecord & { id: string; processing_status: string; error_message: string | null; attempts: number };
type StoredEntitlement = NewEntitlement & { id: string };

export function memoryRepo(users: Record<string, string> = {}) {
  const events: StoredEvent[] = [];
  const entitlements: StoredEntitlement[] = [];
  const repo: HotmartRepository = {
    async recordEvent(e) {
      const existing = events.find((x) => x.external_event_id === e.external_event_id);
      if (existing) {
        existing.attempts += 1;
        return { id: existing.id, existingStatus: existing.processing_status };
      }
      const row = { ...e, id: `we-${events.length + 1}`, processing_status: "received", error_message: null, attempts: 1 };
      events.push(row);
      return { id: row.id, existingStatus: null };
    },
    async markEvent(id, status, errorMessage) {
      const e = events.find((x) => x.id === id)!;
      e.processing_status = status;
      e.error_message = errorMessage ?? null;
    },
    async findEntitlementByTransaction(tx) {
      const e = entitlements.find((x) => x.transaction === tx);
      return e ? (toRow(e) as EntitlementRow) : null;
    },
    async insertEntitlement(row) {
      if (entitlements.some((x) => x.transaction === row.transaction)) throw new Error("duplicate key");
      const stored = { ...row, id: `ent-${entitlements.length + 1}` };
      entitlements.push(stored);
      return toRow(stored);
    },
    async updateEntitlement(id, patch) {
      Object.assign(entitlements.find((x) => x.id === id)!, patch);
    },
    async findUserIdByEmail(email) {
      return users[email] ?? null;
    },
  };
  return { repo, events, entitlements };
}

function toRow(e: StoredEntitlement): EntitlementRow {
  return {
    id: e.id,
    user_id: e.user_id,
    email: e.email,
    status: e.status,
    transaction: e.transaction,
    last_event_at: e.last_event_at,
  };
}
