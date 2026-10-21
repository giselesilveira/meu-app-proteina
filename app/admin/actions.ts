"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/access";
import { endOfAccessDay, formatAccessUntil } from "@/lib/access-period";
import { addDays, isISODate, localDateISO } from "@/lib/dates";
import { validateFoodCsv, type FoodCsvRow } from "@/lib/csv";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { normalizeText } from "@/lib/search";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/types";

/**
 * Ações administrativas. TODAS começam por requireAdmin() (e-mail em ADMIN_EMAILS,
 * verificado no servidor) e registram quem fez o quê em admin_audit_log.
 */

async function audit(adminEmail: string, action: string, targetType: string, targetId: string | null, details: Record<string, unknown>) {
  const db = createAdminClient();
  const { error } = await db.from("admin_audit_log").insert({ admin_email: adminEmail, action, target_type: targetType, target_id: targetId, details });
  if (error) console.error("[admin audit]", error.message);
}

function fail(e: unknown, ctx: string): ActionResult<never> {
  console.error(`[admin:${ctx}]`, e instanceof Error ? e.message : e);
  return { ok: false, error: "Não foi possível concluir. Tente novamente." };
}

// ------------------------------------------------------------- acessos

export async function revokeEntitlement(id: string, reason: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Acesso não encontrado." };
  try {
    const db = createAdminClient();
    const { error } = await db
      .from("entitlements")
      .update({ status: "revoked", revoked_at: new Date().toISOString(), revoke_reason: `manual: ${reason.slice(0, 200) || "sem motivo"}` })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await audit(admin.email, "entitlement_revoke", "entitlement", id, { reason });
  } catch (e) {
    return fail(e, "revoke");
  }
  revalidatePath("/admin");
  return { ok: true, message: "Acesso revogado." };
}

export async function reactivateEntitlement(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Acesso não encontrado." };
  try {
    const db = createAdminClient();
    const { error } = await db
      .from("entitlements")
      .update({ status: "active", revoked_at: null, revoke_reason: null })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await audit(admin.email, "entitlement_reactivate", "entitlement", id, {});
  } catch (e) {
    return fail(e, "reactivate");
  }
  revalidatePath("/admin");
  return { ok: true, message: "Acesso reativado." };
}

const extendSchema = z.object({
  id: z.string().uuid(),
  until: z.string(),
  reason: z.string().trim().min(3, "Informe o motivo.").max(300),
});

/**
 * Prorroga o acesso até o fim do dia informado. Só para acessos não revogados
 * (revogado: reative primeiro). A nova data precisa ser futura, posterior ao
 * vencimento atual e no máximo 24 meses à frente.
 */
export async function extendEntitlement(input: z.input<typeof extendSchema>): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = extendSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira os dados." };
  const { id, until, reason } = parsed.data;
  const today = localDateISO(new Date());
  if (!isISODate(until) || until < today) return { ok: false, error: "Escolha uma data a partir de hoje." };
  if (until > addDays(today, 730)) return { ok: false, error: "A prorrogação pode ser de no máximo 24 meses." };
  const newExpiry = endOfAccessDay(until);
  try {
    const db = createAdminClient();
    const { data: ent, error: selErr } = await db.from("entitlements").select("id, status, access_expires_at").eq("id", id).maybeSingle();
    if (selErr) throw new Error(selErr.message);
    if (!ent) return { ok: false, error: "Acesso não encontrado." };
    if (ent.status === "revoked") return { ok: false, error: "Este acesso está revogado. Reative antes de prorrogar." };
    if (ent.access_expires_at && newExpiry.getTime() <= new Date(ent.access_expires_at).getTime()) {
      return { ok: false, error: `A nova data deve ser posterior ao vencimento atual (${formatAccessUntil(ent.access_expires_at)}).` };
    }
    const { error } = await db.from("entitlements").update({ access_expires_at: newExpiry.toISOString(), status: "active" }).eq("id", id);
    if (error) throw new Error(error.message);
    await audit(admin.email, "entitlement_extend", "entitlement", id, {
      reason,
      previous_expires_at: ent.access_expires_at,
      new_expires_at: newExpiry.toISOString(),
    });
  } catch (e) {
    return fail(e, "extend");
  }
  revalidatePath("/admin");
  return { ok: true, message: `Acesso prorrogado até ${formatAccessUntil(newExpiry)}.` };
}

const manualSchema = z.object({
  email: z.string(),
  reason: z.string().trim().min(3, "Informe o motivo.").max(300),
  expiresAt: z.string().nullable(),
});

export async function grantManualAccess(input: z.input<typeof manualSchema>): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = manualSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira os dados." };
  const email = normalizeEmail(parsed.data.email);
  if (!isValidEmail(email)) return { ok: false, error: "E-mail inválido." };
  let expires: string | null = null;
  if (parsed.data.expiresAt) {
    const today = localDateISO(new Date());
    if (!isISODate(parsed.data.expiresAt) || parsed.data.expiresAt < today) {
      return { ok: false, error: "A data de expiração precisa ser hoje ou futura." };
    }
    expires = endOfAccessDay(parsed.data.expiresAt).toISOString(); // acesso até o fim do dia escolhido
  }
  try {
    const db = createAdminClient();
    const { data: profile } = await db.from("profiles").select("user_id").eq("email", email).maybeSingle();
    const { data, error } = await db
      .from("entitlements")
      .insert({
        email,
        user_id: profile?.user_id ?? null,
        source: "manual",
        status: "active",
        reason: parsed.data.reason,
        granted_by: admin.email,
        access_expires_at: expires,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await audit(admin.email, "entitlement_manual_grant", "entitlement", data.id, { email, reason: parsed.data.reason, expires });
  } catch (e) {
    return fail(e, "manual");
  }
  revalidatePath("/admin");
  return { ok: true, message: `Acesso liberado para ${email}.` };
}

// ------------------------------------------------------------- catálogo

function foodRow(row: FoodCsvRow, adminEmail: string) {
  return {
    name: row.brand ? `${row.display_name} (${row.brand})` : row.display_name,
    display_name: row.display_name,
    brand: row.brand,
    category: row.category,
    preparation: row.preparation,
    protein_per_100g: row.protein_per_100g,
    calories_per_100g: row.calories_per_100g,
    fat_per_100g: row.fat_per_100g,
    carbohydrate_per_100g: row.carbohydrate_per_100g,
    fiber_per_100g: row.fiber_per_100g,
    sodium_mg_per_100g: row.sodium_mg_per_100g,
    default_serving_g: row.default_serving_g,
    serving_label: row.serving_label,
    source_type: row.source_type,
    source_reference: row.source_reference,
    added_by: adminEmail,
    added_at: new Date().toISOString(),
    is_active: true,
  };
}

/** Importa CSV de alimentos de rótulo / validados pela equipe. Valida tudo antes de gravar. */
export async function importFoodsCsv(content: string, apply: boolean): Promise<ActionResult<{ valid: number; errors: { line: number; message: string }[] }>> {
  const admin = await requireAdmin();
  if (content.length > 500_000) return { ok: false, error: "Arquivo muito grande (máx. 500 KB)." };
  const result = validateFoodCsv(content);
  if (!apply || result.errors.length > 0) {
    return { ok: true, data: { valid: result.rows.length, errors: result.errors } };
  }
  try {
    const db = createAdminClient();
    const rows = result.rows.map((r) => foodRow(r, admin.email));
    // Reimportar o mesmo CSV não duplica: atualiza itens de mesmo nome + marca + origem.
    for (const r of rows) {
      let query = db.from("food_catalog").select("id").eq("display_name", r.display_name).eq("source_type", r.source_type);
      query = r.brand ? query.eq("brand", r.brand) : query.is("brand", null);
      const { data: existing } = await query.maybeSingle();
      const { error } = existing
        ? await db.from("food_catalog").update(r).eq("id", existing.id)
        : await db.from("food_catalog").insert(r);
      if (error) throw new Error(error.message);
    }
    await audit(admin.email, "food_csv_import", "food_catalog", null, { count: rows.length });
  } catch (e) {
    return fail(e, "csv");
  }
  revalidatePath("/admin/alimentos");
  return { ok: true, data: { valid: result.rows.length, errors: [] }, message: `${result.rows.length} alimento(s) importado(s).` };
}

/** Cadastro individual (rótulo ou validado pela equipe) reaproveitando a validação do CSV. */
export async function addFood(record: Record<string, string>): Promise<ActionResult> {
  const header = Object.keys(record).join(";");
  const line = Object.values(record)
    .map((v) => `"${(v ?? "").replace(/"/g, '""')}"`)
    .join(";");
  const res = await importFoodsCsv(`${header}\n${line}`, true);
  if (!res.ok) return res;
  if (res.data && res.data.errors.length) return { ok: false, error: res.data.errors.map((e) => e.message).join("; ") };
  return { ok: true, message: "Alimento cadastrado." };
}

export async function setFoodActive(id: string, active: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Alimento não encontrado." };
  try {
    const db = createAdminClient();
    if (active) {
      const { data } = await db.from("food_catalog").select("protein_per_100g, calories_per_100g").eq("id", id).single();
      if (!data || data.protein_per_100g === null || data.calories_per_100g === null) {
        return { ok: false, error: "Este alimento não tem proteína/calorias na fonte e não pode ser ativado." };
      }
    }
    const { error } = await db.from("food_catalog").update({ is_active: active }).eq("id", id);
    if (error) throw new Error(error.message);
    await audit(admin.email, active ? "food_activate" : "food_deactivate", "food_catalog", id, {});
  } catch (e) {
    return fail(e, "foodActive");
  }
  revalidatePath("/admin/alimentos");
  return { ok: true, message: active ? "Alimento ativado." : "Alimento desativado." };
}

const editSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string().trim().min(2).max(140),
  default_serving_g: z.number().gt(0).max(2000).nullable(),
  serving_label: z.string().trim().max(40).nullable(),
  aliases: z.array(z.string().trim().min(2).max(80)).max(20),
});

/**
 * Edição: nome amigável, porção e termos de busca. Valores nutricionais de itens
 * TACO NÃO são editáveis aqui (vêm só do importador oficial).
 */
export async function editFood(input: z.input<typeof editSchema>): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = editSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Confira os campos." };
  const v = parsed.data;
  try {
    const db = createAdminClient();
    const { data: food } = await db.from("food_catalog").select("preparation").eq("id", v.id).single();
    if (food?.preparation) {
      const stem = String(food.preparation).replace(/ \(10 minutos\)/, "").replace(/[oa]s?$/, "");
      if (!v.display_name.toLowerCase().includes(stem)) {
        return { ok: false, error: `O nome precisa manter a preparação (“${food.preparation}”).` };
      }
    }
    const { error } = await db
      .from("food_catalog")
      .update({ display_name: v.display_name, default_serving_g: v.default_serving_g, serving_label: v.serving_label || null })
      .eq("id", v.id);
    if (error) throw new Error(error.message);
    await db.from("food_aliases").delete().eq("food_id", v.id);
    const unique = [...new Map(v.aliases.map((a) => [normalizeText(a), a])).values()];
    if (unique.length) {
      const { error: aErr } = await db.from("food_aliases").insert(unique.map((alias) => ({ food_id: v.id, alias })));
      if (aErr) throw new Error(aErr.message);
    }
    await audit(admin.email, "food_edit", "food_catalog", v.id, { display_name: v.display_name, aliases: v.aliases });
  } catch (e) {
    return fail(e, "editFood");
  }
  revalidatePath("/admin/alimentos");
  return { ok: true, message: "Alimento atualizado." };
}
