import { describe, expect, it, vi } from "vitest";
import { formatAccessUntil } from "@/lib/access-period";
import { processHotmartWebhook, type HotmartConfig } from "@/lib/hotmart/process";
import { HOTTOK, memoryRepo, payload, PRODUCT } from "./helpers/hotmart";

const config: HotmartConfig = { hottok: HOTTOK, allowedProductUcodes: [PRODUCT], allowedOfferCodes: [] };
const sp = (iso: string) => new Date(`${iso}-03:00`).getTime();

function setup(nowIso = "2026-10-22T12:00:00Z") {
  const mem = memoryRepo();
  const now = () => new Date(nowIso);
  const send = (body: unknown) =>
    processHotmartWebhook({ rawBody: JSON.stringify(body), hottokHeader: HOTTOK }, { repo: mem.repo, config, now, sendWelcomeEmail: vi.fn(async () => {}) });
  return { ...mem, send };
}
const until = (e: { access_expires_at: string | null }) => (e.access_expires_at ? formatAccessUntil(e.access_expires_at) : null);

describe("prazo de 6 meses nas compras Hotmart", () => {
  it("conta da data REAL de aprovação (purchase.approved_date), não da hora do processamento", async () => {
    const t = setup("2026-10-22T12:00:00Z");
    await t.send(payload("PURCHASE_APPROVED", { approvedAt: sp("2026-10-20T09:15:00"), createdAt: sp("2026-10-22T08:00:00") }));
    expect(t.entitlements[0].purchase_approved_at).toBe("2026-10-20T12:15:00.000Z");
    expect(until(t.entitlements[0])).toBe("20/04/2027");
  });

  it("31 de agosto → 28 de fevereiro; em ano bissexto → 29 de fevereiro", async () => {
    const t = setup();
    await t.send(payload("PURCHASE_APPROVED", { transaction: "HP-A", approvedAt: sp("2026-08-31T22:00:00") }));
    await t.send(payload("PURCHASE_APPROVED", { transaction: "HP-B", approvedAt: sp("2027-08-31T10:00:00") }));
    expect(until(t.entitlements[0])).toBe("28/02/2027");
    expect(until(t.entitlements[1])).toBe("29/02/2028");
  });

  it("sem approved_date, usa a data do evento", async () => {
    const t = setup();
    await t.send(payload("PURCHASE_APPROVED", { approvedAt: null, createdAt: sp("2026-05-10T10:00:00") }));
    expect(until(t.entitlements[0])).toBe("10/11/2026");
  });

  it("reenvio, evento duplicado e PURCHASE_COMPLETE não reiniciam nem prorrogam o prazo", async () => {
    const t = setup();
    const first = payload("PURCHASE_APPROVED", { id: "evt-x", approvedAt: sp("2026-10-01T10:00:00") });
    await t.send(first);
    const original = t.entitlements[0].access_expires_at;
    await t.send(first); // mesmo evento
    await t.send(payload("PURCHASE_APPROVED", { approvedAt: sp("2026-10-15T10:00:00") })); // reenvio com data diferente
    await t.send(payload("PURCHASE_COMPLETE", { approvedAt: sp("2026-10-30T10:00:00") })); // fim da garantia
    expect(t.entitlements).toHaveLength(1);
    expect(t.entitlements[0].access_expires_at).toBe(original);
    expect(until(t.entitlements[0])).toBe("01/04/2027");
  });

  it("reativação da mesma compra preserva o vencimento original", async () => {
    const t = setup();
    await t.send(payload("PURCHASE_APPROVED", { approvedAt: sp("2026-09-01T10:00:00") }));
    const original = t.entitlements[0].access_expires_at;
    await t.send(payload("PURCHASE_REFUNDED"));
    expect(t.entitlements[0].status).toBe("revoked");
    const r = await t.send(payload("PURCHASE_APPROVED", { approvedAt: sp("2026-10-20T10:00:00") }));
    expect(r.body.detail).toBe("acesso reativado");
    expect(t.entitlements[0].status).toBe("active");
    expect(t.entitlements[0].access_expires_at).toBe(original);
  });

  it("reativação depois do vencimento não devolve acesso (prazo continua vencido)", async () => {
    const t = setup("2027-06-01T12:00:00Z");
    await t.send(payload("PURCHASE_APPROVED", { approvedAt: sp("2026-09-01T10:00:00") }));
    await t.send(payload("PURCHASE_CANCELED"));
    const r = await t.send(payload("PURCHASE_APPROVED"));
    expect(r.body.detail).toBe("acesso reativado, mas o prazo já venceu");
    expect(until(t.entitlements[0])).toBe("01/03/2027");
  });

  it("nova compra (outra transação) gera novo período de 6 meses e não reduz o anterior", async () => {
    const t = setup();
    await t.send(payload("PURCHASE_APPROVED", { transaction: "HP-1", approvedAt: sp("2026-06-10T10:00:00") }));
    await t.send(payload("PURCHASE_APPROVED", { transaction: "HP-2", approvedAt: sp("2026-10-20T10:00:00") }));
    expect(t.entitlements.map(until)).toEqual(["10/12/2026", "20/04/2027"]);
  });

  it("reembolso, chargeback e cancelamento continuam revogando, mesmo dentro do prazo", async () => {
    for (const ev of ["PURCHASE_REFUNDED", "PURCHASE_CHARGEBACK", "PURCHASE_CANCELED"]) {
      const t = setup();
      await t.send(payload("PURCHASE_APPROVED", { approvedAt: sp("2026-10-20T10:00:00") }));
      await t.send(payload(ev));
      expect(t.entitlements[0].status).toBe("revoked");
      expect(t.entitlements[0].access_expires_at).not.toBeNull();
    }
  });

  it("revogação que chega antes da aprovação: aprovação posterior válida preenche o prazo uma única vez", async () => {
    const t = setup();
    await t.send(payload("PURCHASE_REFUNDED", { createdAt: sp("2026-10-20T10:00:00") }));
    expect(t.entitlements[0].access_expires_at).toBeNull();
    await t.send(payload("PURCHASE_APPROVED", { createdAt: sp("2026-10-21T10:00:00"), approvedAt: sp("2026-10-19T10:00:00") }));
    expect(until(t.entitlements[0])).toBe("19/04/2027");
    await t.send(payload("PURCHASE_COMPLETE", { createdAt: sp("2026-10-30T10:00:00"), approvedAt: sp("2026-10-25T10:00:00") }));
    expect(until(t.entitlements[0])).toBe("19/04/2027");
  });

  it("acesso legado sem prazo recebe o prazo pela data de aprovação guardada, sem prorrogar", async () => {
    const t = setup();
    await t.send(payload("PURCHASE_APPROVED", { approvedAt: sp("2026-10-05T10:00:00") }));
    t.entitlements[0].access_expires_at = null; // simula acesso criado antes desta regra
    await t.send(payload("PURCHASE_COMPLETE", { approvedAt: sp("2026-10-30T10:00:00") }));
    expect(until(t.entitlements[0])).toBe("05/04/2027");
  });
});
