import { describe, expect, it, vi } from "vitest";
import { processHotmartWebhook, type HotmartConfig } from "@/lib/hotmart/process";
import { redactPayload } from "@/lib/hotmart/schema";
import { isValidHottok } from "@/lib/hotmart/verify";
import { HOTTOK, memoryRepo, OFFER, payload, PRODUCT } from "./helpers/hotmart";

const config: HotmartConfig = { hottok: HOTTOK, allowedProductUcodes: [PRODUCT], allowedOfferCodes: [] };

function setup(opts: { users?: Record<string, string>; config?: Partial<HotmartConfig> } = {}) {
  const mem = memoryRepo(opts.users);
  const sendWelcomeEmail = vi.fn(async () => {});
  const deps = { repo: mem.repo, config: { ...config, ...opts.config }, sendWelcomeEmail };
  const send = (body: unknown, token: string | null = HOTTOK) =>
    processHotmartWebhook({ rawBody: JSON.stringify(body), hottokHeader: token }, deps);
  return { ...mem, send, sendWelcomeEmail };
}

describe("autenticidade (X-HOTMART-HOTTOK)", () => {
  it("compara em tempo constante e recusa vazio", () => {
    expect(isValidHottok(HOTTOK, HOTTOK)).toBe(true);
    expect(isValidHottok("outro", HOTTOK)).toBe(false);
    expect(isValidHottok(null, HOTTOK)).toBe(false);
    expect(isValidHottok(HOTTOK, "")).toBe(false);
  });
  it("hottok inválido => 401 e nada é gravado", async () => {
    const t = setup();
    const res = await t.send(payload("PURCHASE_APPROVED"), "errado");
    expect(res.status).toBe(401);
    expect(t.events).toHaveLength(0);
    expect(t.entitlements).toHaveLength(0);
  });
  it("sem HOTMART_HOTTOK configurado => recusa", async () => {
    const t = setup({ config: { hottok: "" } });
    expect((await t.send(payload("PURCHASE_APPROVED"))).status).toBe(503);
  });
  it("JSON inválido / payload inválido => 400", async () => {
    const t = setup();
    const bad = await processHotmartWebhook({ rawBody: "{", hottokHeader: HOTTOK }, { repo: t.repo, config });
    expect(bad.status).toBe(400);
    expect((await t.send({ foo: 1 })).status).toBe(400);
  });
});

describe("compra aprovada", () => {
  it("cria entitlement ativo com e-mail normalizado, sem user_id antes do primeiro login", async () => {
    const t = setup();
    const res = await t.send(payload("PURCHASE_APPROVED"));
    expect(res.status).toBe(200);
    expect(res.body.result).toBe("processed");
    expect(t.entitlements).toHaveLength(1);
    expect(t.entitlements[0]).toMatchObject({
      email: "maria.exemplo@example.com",
      status: "active",
      user_id: null,
      product_ucode: PRODUCT,
      offer_code: OFFER,
      transaction: "HP0000000001",
      hotmart_buyer_ucode: "buyer-ucode-1",
      source: "hotmart",
    });
    expect(t.events[0].processing_status).toBe("processed");
    expect(t.sendWelcomeEmail).toHaveBeenCalledWith("maria.exemplo@example.com", "Maria");
  });

  it("associa ao usuário se ele já existe", async () => {
    const t = setup({ users: { "maria.exemplo@example.com": "user-1" } });
    await t.send(payload("PURCHASE_APPROVED"));
    expect(t.entitlements[0].user_id).toBe("user-1");
  });

  it("PURCHASE_COMPLETE também libera e não duplica", async () => {
    const t = setup();
    await t.send(payload("PURCHASE_APPROVED"));
    await t.send(payload("PURCHASE_COMPLETE"));
    expect(t.entitlements).toHaveLength(1);
    expect(t.entitlements[0].status).toBe("active");
    expect(t.sendWelcomeEmail).toHaveBeenCalledTimes(1);
  });

  it("produto fora de HOTMART_ALLOWED_PRODUCT_UCODES não libera acesso", async () => {
    const t = setup();
    const res = await t.send(payload("PURCHASE_APPROVED", { product: "outro-produto" }));
    expect(res.status).toBe(200);
    expect(res.body.result).toBe("ignored");
    expect(t.entitlements).toHaveLength(0);
  });

  it("lista de produtos vazia => nenhum produto libera", async () => {
    const t = setup({ config: { allowedProductUcodes: [] } });
    await t.send(payload("PURCHASE_APPROVED"));
    expect(t.entitlements).toHaveLength(0);
  });

  it("filtra por oferta quando HOTMART_ALLOWED_OFFER_CODES está configurado", async () => {
    const t = setup({ config: { allowedOfferCodes: ["xyz", OFFER] } });
    await t.send(payload("PURCHASE_APPROVED", { offer: "nao-permitida", transaction: "HP1" }));
    await t.send(payload("PURCHASE_APPROVED", { offer: OFFER, transaction: "HP2" }));
    expect(t.entitlements.map((e) => e.transaction)).toEqual(["HP2"]);
  });

  it("falha no e-mail de boas-vindas não impede a liberação", async () => {
    const t = setup();
    t.sendWelcomeEmail.mockRejectedValueOnce(new Error("smtp fora"));
    const res = await t.send(payload("PURCHASE_APPROVED"));
    expect(res.body.result).toBe("processed");
    expect(t.entitlements[0].status).toBe("active");
  });
});

describe("idempotência", () => {
  it("evento duplicado (mesmo id) não cria dois acessos nem reenvia e-mail", async () => {
    const t = setup();
    const body = payload("PURCHASE_APPROVED", { id: "evento-fixo" });
    await t.send(body);
    const again = await t.send(body);
    expect(again.status).toBe(200);
    expect(again.body.result).toBe("duplicate");
    expect(t.entitlements).toHaveLength(1);
    expect(t.events).toHaveLength(1);
    expect(t.events[0].attempts).toBe(2);
    expect(t.sendWelcomeEmail).toHaveBeenCalledTimes(1);
  });

  it("evento que falhou é reprocessado no reenvio", async () => {
    const t = setup();
    const original = t.repo.insertEntitlement;
    t.repo.insertEntitlement = async () => {
      throw new Error("banco indisponível");
    };
    const body = payload("PURCHASE_APPROVED", { id: "evento-retry" });
    const first = await t.send(body);
    expect(first.status).toBe(500);
    expect(t.events[0].processing_status).toBe("failed");
    t.repo.insertEntitlement = original;
    const second = await t.send(body);
    expect(second.status).toBe(200);
    expect(t.entitlements).toHaveLength(1);
    expect(t.events[0].processing_status).toBe("processed");
  });
});

describe("reembolso, chargeback, cancelamento e reativação", () => {
  it.each(["PURCHASE_REFUNDED", "PURCHASE_CHARGEBACK", "PURCHASE_CANCELED"])("%s revoga o acesso", async (event) => {
    const t = setup();
    await t.send(payload("PURCHASE_APPROVED"));
    const res = await t.send(payload(event));
    expect(res.body.result).toBe("processed");
    expect(t.entitlements).toHaveLength(1);
    expect(t.entitlements[0].status).toBe("revoked");
    expect(t.entitlements[0].revoked_at).not.toBeNull();
    expect(t.entitlements[0].revoke_reason).toBe(event);
  });

  it("reativação após revogação, por um novo evento válido", async () => {
    const t = setup();
    await t.send(payload("PURCHASE_APPROVED"));
    await t.send(payload("PURCHASE_REFUNDED"));
    const res = await t.send(payload("PURCHASE_APPROVED"));
    expect(res.body.detail).toBe("acesso reativado");
    expect(t.entitlements[0]).toMatchObject({ status: "active", revoked_at: null, revoke_reason: null });
  });

  it("aprovação antiga reenviada depois do reembolso NÃO reativa (fora de ordem)", async () => {
    const t = setup();
    await t.send(payload("PURCHASE_APPROVED", { createdAt: 1000_000 }));
    await t.send(payload("PURCHASE_REFUNDED", { createdAt: 3000_000 }));
    const stale = await t.send(payload("PURCHASE_APPROVED", { createdAt: 2000_000 }));
    expect(stale.body.result).toBe("ignored");
    expect(t.entitlements[0].status).toBe("revoked");
  });

  it("reembolso que chega antes da aprovação bloqueia a aprovação atrasada", async () => {
    const t = setup();
    await t.send(payload("PURCHASE_REFUNDED", { createdAt: 3000_000 }));
    await t.send(payload("PURCHASE_APPROVED", { createdAt: 1000_000 }));
    expect(t.entitlements).toHaveLength(1);
    expect(t.entitlements[0].status).toBe("revoked");
  });

  it("disputa (PURCHASE_PROTEST) só é registrada, não revoga", async () => {
    const t = setup();
    await t.send(payload("PURCHASE_APPROVED"));
    const res = await t.send(payload("PURCHASE_PROTEST"));
    expect(res.body.result).toBe("ignored");
    expect(t.entitlements[0].status).toBe("active");
  });
});

describe("LGPD", () => {
  it("payload salvo sem documento, telefone, endereço ou código PIX", async () => {
    const t = setup();
    await t.send(payload("PURCHASE_APPROVED"));
    const saved = JSON.stringify(t.events[0].payload);
    expect(saved).not.toContain("00000000000");
    expect(saved).not.toContain("999990000");
    expect(saved).not.toContain("zipcode");
    expect(saved).not.toContain("pix_code");
    expect(saved).toContain("Maria.Exemplo@Example.com");
  });
  it("redactPayload remove hottok legado do corpo", () => {
    expect(redactPayload({ hottok: "x", a: { document: "1", b: 2 } })).toEqual({ a: { b: 2 } });
  });
});
