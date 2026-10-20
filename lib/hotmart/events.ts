/**
 * Nomes de eventos do Webhook 2.0.0 da Hotmart (conferidos na documentação oficial
 * em outubro/2026 — ver HOTMART_SETUP.md).
 */
export const GRANT_EVENTS = ["PURCHASE_APPROVED", "PURCHASE_COMPLETE"] as const;

/** Eventos confirmados que retiram o direito de acesso. */
export const REVOKE_EVENTS = ["PURCHASE_REFUNDED", "PURCHASE_CHARGEBACK", "PURCHASE_CANCELED"] as const;

/** Eventos apenas registrados (não mudam acesso). */
export const LOG_ONLY_EVENTS = [
  "PURCHASE_PROTEST",
  "PURCHASE_BILLET_PRINTED",
  "PURCHASE_DELAYED",
  "PURCHASE_EXPIRED",
  "PURCHASE_OUT_OF_SHOPPING_CART",
] as const;

export type EventAction = "grant" | "revoke" | "log";

export function actionFor(event: string): EventAction {
  if ((GRANT_EVENTS as readonly string[]).includes(event)) return "grant";
  if ((REVOKE_EVENTS as readonly string[]).includes(event)) return "revoke";
  return "log";
}
