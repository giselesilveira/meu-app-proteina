import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EntitlementRow, HotmartRepository, NewEntitlement, WebhookEventRecord } from "./process";

const ENTITLEMENT_COLUMNS = "id, user_id, email, status, transaction, last_event_at, purchase_approved_at, access_expires_at";
const LEGACY_COLUMNS = "id, user_id, email, status, transaction, last_event_at, access_expires_at";

/**
 * Compatibilidade com o banco ANTES da migração 20261022000001 (sem a coluna
 * purchase_approved_at): o webhook continua funcionando e gravando o vencimento;
 * só a data de aprovação deixa de ser guardada até a migração ser aplicada.
 */
function missingApprovedColumn(error: { message?: string; code?: string } | null): boolean {
  return Boolean(error && (error.message ?? "").includes("purchase_approved_at"));
}

function withoutApproved<T extends { purchase_approved_at?: unknown }>(row: T): Omit<T, "purchase_approved_at"> {
  const { purchase_approved_at: _ignored, ...rest } = row;
  void _ignored;
  return rest;
}

export function createSupabaseHotmartRepo(db: SupabaseClient): HotmartRepository {
  return {
    async recordEvent(e: WebhookEventRecord) {
      const { data, error } = await db
        .from("webhook_events")
        .insert({ provider: "hotmart", ...e, processing_status: "received" })
        .select("id")
        .single();
      if (!error && data) return { id: data.id as string, existingStatus: null };
      if (error && error.code !== "23505") throw new Error(`webhook_events insert: ${error.message}`);

      // Evento repetido (mesmo id): reaproveita o registro existente.
      const { data: existing, error: selErr } = await db
        .from("webhook_events")
        .select("id, processing_status, attempts")
        .eq("provider", "hotmart")
        .eq("external_event_id", e.external_event_id)
        .single();
      if (selErr || !existing) throw new Error(`webhook_events select: ${selErr?.message}`);
      await db
        .from("webhook_events")
        .update({ attempts: (existing.attempts as number) + 1 })
        .eq("id", existing.id);
      return { id: existing.id as string, existingStatus: existing.processing_status as string };
    },

    async markEvent(id, status, errorMessage) {
      const { error } = await db
        .from("webhook_events")
        .update({ processing_status: status, processed_at: new Date().toISOString(), error_message: errorMessage ?? null })
        .eq("id", id);
      if (error) throw new Error(`webhook_events update: ${error.message}`);
    },

    async findEntitlementByTransaction(transaction) {
      const find = (columns: string) =>
        db.from("entitlements").select(columns).eq("source", "hotmart").eq("transaction", transaction).maybeSingle();
      let { data, error } = await find(ENTITLEMENT_COLUMNS);
      let legacy = false;
      if (missingApprovedColumn(error)) {
        ({ data, error } = await find(LEGACY_COLUMNS));
        legacy = true;
      }
      if (error) throw new Error(`entitlements select: ${error.message}`);
      if (!data) return null;
      return (legacy ? { ...(data as object), purchase_approved_at: null } : data) as unknown as EntitlementRow;
    },

    async insertEntitlement(row: NewEntitlement) {
      let { data, error } = await db.from("entitlements").insert(row).select(ENTITLEMENT_COLUMNS).single();
      let legacy = false;
      if (missingApprovedColumn(error)) {
        ({ data, error } = await db.from("entitlements").insert(withoutApproved(row)).select(LEGACY_COLUMNS).single());
        legacy = true;
      }
      if (error) {
        // Corrida entre duas entregas simultâneas: a outra já criou; falha => Hotmart reenvia.
        throw new Error(`entitlements insert: ${error.message}`);
      }
      return (legacy ? { ...(data as object), purchase_approved_at: null } : data) as unknown as EntitlementRow;
    },

    async updateEntitlement(id, patch) {
      let { error } = await db.from("entitlements").update(patch).eq("id", id);
      if (missingApprovedColumn(error) && "purchase_approved_at" in patch) {
        ({ error } = await db.from("entitlements").update(withoutApproved(patch)).eq("id", id));
      }
      if (error) throw new Error(`entitlements update: ${error.message}`);
    },

    async findUserIdByEmail(email) {
      const { data, error } = await db.from("profiles").select("user_id").eq("email", email).maybeSingle();
      if (error) throw new Error(`profiles select: ${error.message}`);
      return (data?.user_id as string | undefined) ?? null;
    },
  };
}
