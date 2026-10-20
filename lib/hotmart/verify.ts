import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Valida o header X-HOTMART-HOTTOK (Webhook 2.0.0) contra HOTMART_HOTTOK.
 * Comparação em tempo constante; sem segredo configurado, recusa tudo.
 */
export function isValidHottok(received: string | null | undefined, expected: string): boolean {
  if (!expected || !received) return false;
  const a = createHash("sha256").update(received.trim()).digest();
  const b = createHash("sha256").update(expected.trim()).digest();
  return timingSafeEqual(a, b);
}
