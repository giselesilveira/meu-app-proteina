import { z } from "zod";

/**
 * Envelope do Webhook 2.0.0 da Hotmart (eventos de compra).
 * Referência: https://developers.hotmart.com/docs/pt-BR/2.0.0/webhook/purchase-webhook/
 * Só validamos os campos que usamos; o restante passa adiante sem ser rejeitado.
 */
const timestamp = z.union([z.number(), z.string()]);

export const hotmartPayloadSchema = z
  .object({
    id: z.string().min(1),
    creation_date: timestamp.optional(),
    event: z.string().min(1),
    version: z.string().optional(),
    data: z
      .object({
        product: z
          .object({
            id: z.union([z.number(), z.string()]).optional(),
            ucode: z.string().optional(),
            name: z.string().optional(),
          })
          .passthrough()
          .optional(),
        buyer: z
          .object({
            email: z.string().optional(),
            name: z.string().optional(),
            first_name: z.string().optional(),
            ucode: z.string().optional(),
          })
          .passthrough()
          .optional(),
        purchase: z
          .object({
            transaction: z.string().optional(),
            status: z.string().optional(),
            approved_date: timestamp.optional(),
            offer: z.object({ code: z.string().optional() }).passthrough().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough(),
  })
  .passthrough();

export type HotmartPayload = z.infer<typeof hotmartPayloadSchema>;

/** Converte timestamp da Hotmart (ms, s ou ISO) em Date. */
export function toDate(value: number | string | undefined): Date | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number" || /^\d+$/.test(value)) {
    const n = Number(value);
    const d = new Date(n < 1e11 ? n * 1000 : n);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Dados pessoais que não precisamos guardar (LGPD: armazenar só o necessário).
const PII_KEYS = new Set([
  "document",
  "document_type",
  "address",
  "checkout_phone",
  "checkout_phone_code",
  "phone",
  "zipcode",
  "pix_code",
  "pix_qrcode",
  "billet_barcode",
  "billet_url",
  "hottok",
]);

/** Remove documentos, endereço, telefone e qualquer segredo antes de salvar o payload. */
export function redactPayload(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(redactPayload);
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (PII_KEYS.has(k)) continue;
      out[k] = redactPayload(v);
    }
    return out;
  }
  return input;
}
