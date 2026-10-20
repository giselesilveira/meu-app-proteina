import { normalizeEmail, isValidEmail } from "../email";
import { actionFor } from "./events";
import { hotmartPayloadSchema, redactPayload, toDate, type HotmartPayload } from "./schema";
import { isValidHottok } from "./verify";

export type EntitlementStatus = "active" | "revoked" | "expired";

export interface EntitlementRow {
  id: string;
  user_id: string | null;
  email: string;
  status: EntitlementStatus;
  transaction: string;
  last_event_at: string | null;
}

export interface NewEntitlement {
  email: string;
  user_id: string | null;
  source: "hotmart";
  product_ucode: string | null;
  offer_code: string | null;
  transaction: string;
  hotmart_buyer_ucode: string | null;
  status: EntitlementStatus;
  granted_at: string;
  revoked_at: string | null;
  revoke_reason: string | null;
  last_event_at: string;
  last_event_type: string;
}

export interface WebhookEventRecord {
  external_event_id: string;
  event_type: string;
  transaction: string | null;
  payload: unknown;
}

/** Acesso a dados usado pelo processamento (Supabase em produção, memória nos testes). */
export interface HotmartRepository {
  /** Insere o evento; se já existir (mesmo id), devolve o registro existente. */
  recordEvent(e: WebhookEventRecord): Promise<{ id: string; existingStatus: string | null }>;
  markEvent(id: string, status: "processed" | "ignored" | "failed", errorMessage?: string | null): Promise<void>;
  findEntitlementByTransaction(transaction: string): Promise<EntitlementRow | null>;
  insertEntitlement(row: NewEntitlement): Promise<EntitlementRow>;
  updateEntitlement(id: string, patch: Partial<NewEntitlement>): Promise<void>;
  findUserIdByEmail(email: string): Promise<string | null>;
}

export interface HotmartConfig {
  hottok: string;
  allowedProductUcodes: string[];
  allowedOfferCodes: string[];
}

export interface ProcessDeps {
  repo: HotmartRepository;
  config: HotmartConfig;
  now?: () => Date;
  sendWelcomeEmail?: (to: string, name: string | null) => Promise<void>;
  log?: (message: string, extra?: Record<string, unknown>) => void;
}

export interface ProcessResult {
  status: number;
  body: { ok: boolean; result: string; detail?: string };
}

const ok = (result: string, detail?: string): ProcessResult => ({ status: 200, body: { ok: true, result, detail } });

export async function processHotmartWebhook(
  input: { rawBody: string; hottokHeader: string | null },
  deps: ProcessDeps,
): Promise<ProcessResult> {
  const now = deps.now ?? (() => new Date());
  const log = deps.log ?? (() => {});

  if (!deps.config.hottok) {
    log("HOTMART_HOTTOK não configurado — webhook recusado");
    return { status: 503, body: { ok: false, result: "not_configured" } };
  }
  if (!isValidHottok(input.hottokHeader, deps.config.hottok)) {
    return { status: 401, body: { ok: false, result: "unauthorized" } };
  }

  let json: unknown;
  try {
    json = JSON.parse(input.rawBody);
  } catch {
    return { status: 400, body: { ok: false, result: "invalid_json" } };
  }
  const parsed = hotmartPayloadSchema.safeParse(json);
  if (!parsed.success) {
    return { status: 400, body: { ok: false, result: "invalid_payload" } };
  }
  const payload = parsed.data;
  const transaction = payload.data.purchase?.transaction?.trim() || null;

  const recorded = await deps.repo.recordEvent({
    external_event_id: payload.id,
    event_type: payload.event,
    transaction,
    payload: redactPayload(json),
  });
  if (recorded.existingStatus === "processed" || recorded.existingStatus === "ignored") {
    return ok("duplicate");
  }

  try {
    const outcome = await applyEvent(payload, transaction, deps, now());
    await deps.repo.markEvent(recorded.id, outcome.status, outcome.detail ?? null);
    return ok(outcome.status, outcome.detail);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("Falha ao processar webhook Hotmart", { eventId: payload.id, message });
    await deps.repo.markEvent(recorded.id, "failed", message.slice(0, 500)).catch(() => {});
    // 500 => a Hotmart reenvia o evento automaticamente.
    return { status: 500, body: { ok: false, result: "failed" } };
  }
}

interface Outcome {
  status: "processed" | "ignored" | "failed";
  detail?: string;
}

async function applyEvent(payload: HotmartPayload, transaction: string | null, deps: ProcessDeps, now: Date): Promise<Outcome> {
  const action = actionFor(payload.event);
  if (action === "log") return { status: "ignored", detail: `evento ${payload.event} apenas registrado` };

  const { allowedProductUcodes, allowedOfferCodes } = deps.config;
  if (allowedProductUcodes.length === 0) {
    return { status: "ignored", detail: "HOTMART_ALLOWED_PRODUCT_UCODES não configurado" };
  }
  const productUcode = payload.data.product?.ucode?.trim() || null;
  if (!productUcode || !allowedProductUcodes.includes(productUcode)) {
    return { status: "ignored", detail: `produto não liberado: ${productUcode ?? "sem ucode"}` };
  }
  if (!transaction) return { status: "failed", detail: "payload sem purchase.transaction" };

  const offerCode = payload.data.purchase?.offer?.code?.trim() || null;
  const eventAt = toDate(payload.creation_date) ?? now;
  const existing = await deps.repo.findEntitlementByTransaction(transaction);

  // Eventos fora de ordem: um evento mais antigo que o último aplicado não muda nada.
  if (existing?.last_event_at && eventAt.getTime() < new Date(existing.last_event_at).getTime()) {
    return { status: "ignored", detail: "evento mais antigo que o último aplicado nesta transação" };
  }

  const rawEmail = payload.data.buyer?.email ?? "";
  const email = rawEmail ? normalizeEmail(rawEmail) : null;
  const buyerUcode = payload.data.buyer?.ucode?.trim() || null;
  const buyerName = payload.data.buyer?.first_name?.trim() || payload.data.buyer?.name?.trim() || null;

  if (action === "grant") {
    if (allowedOfferCodes.length > 0 && (!offerCode || !allowedOfferCodes.includes(offerCode))) {
      return { status: "ignored", detail: `oferta não liberada: ${offerCode ?? "sem código"}` };
    }
    if (!email || !isValidEmail(email)) return { status: "failed", detail: "payload sem e-mail válido do comprador" };

    if (existing) {
      const reactivated = existing.status !== "active";
      await deps.repo.updateEntitlement(existing.id, {
        status: "active",
        revoked_at: null,
        revoke_reason: null,
        email,
        product_ucode: productUcode,
        offer_code: offerCode,
        hotmart_buyer_ucode: buyerUcode,
        last_event_at: eventAt.toISOString(),
        last_event_type: payload.event,
        ...(reactivated ? { granted_at: now.toISOString() } : {}),
      });
      return { status: "processed", detail: reactivated ? "acesso reativado" : "acesso já ativo" };
    }

    await deps.repo.insertEntitlement({
      email,
      user_id: await deps.repo.findUserIdByEmail(email),
      source: "hotmart",
      product_ucode: productUcode,
      offer_code: offerCode,
      transaction,
      hotmart_buyer_ucode: buyerUcode,
      status: "active",
      granted_at: now.toISOString(),
      revoked_at: null,
      revoke_reason: null,
      last_event_at: eventAt.toISOString(),
      last_event_type: payload.event,
    });
    if (deps.sendWelcomeEmail) {
      // E-mail é opcional: falha no envio não desfaz a liberação.
      await deps.sendWelcomeEmail(email, buyerName).catch((e) =>
        deps.log?.("Falha ao enviar e-mail de boas-vindas", { message: e instanceof Error ? e.message : String(e) }),
      );
    }
    return { status: "processed", detail: "acesso liberado" };
  }

  // revoke
  if (existing) {
    await deps.repo.updateEntitlement(existing.id, {
      status: "revoked",
      revoked_at: now.toISOString(),
      revoke_reason: payload.event,
      last_event_at: eventAt.toISOString(),
      last_event_type: payload.event,
    });
    return { status: "processed", detail: "acesso revogado" };
  }
  if (!email || !isValidEmail(email)) {
    return { status: "ignored", detail: "transação desconhecida e sem e-mail" };
  }
  // Revogação chegou antes da aprovação: registra a transação já revogada para que
  // uma aprovação antiga reenviada depois não libere o acesso.
  await deps.repo.insertEntitlement({
    email,
    user_id: await deps.repo.findUserIdByEmail(email),
    source: "hotmart",
    product_ucode: productUcode,
    offer_code: offerCode,
    transaction,
    hotmart_buyer_ucode: buyerUcode,
    status: "revoked",
    granted_at: now.toISOString(),
    revoked_at: now.toISOString(),
    revoke_reason: payload.event,
    last_event_at: eventAt.toISOString(),
    last_event_type: payload.event,
  });
  return { status: "processed", detail: "transação registrada como revogada" };
}
