"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { accessForAction, actionDeniedMessage, type AppAccess } from "@/lib/access";
import { track } from "@/lib/analytics";
import { addDays, isISODate, localDateISO } from "@/lib/dates";
import { proteinTarget } from "@/lib/nutrition";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

const GENERIC_ERROR = "Não conseguimos salvar agora. Tente novamente em instantes.";

const mealSchema = z.enum(["breakfast", "lunch", "snack", "dinner", "supper", "other"]).nullable();
const factorSchema = z.union([z.literal(1.5), z.literal(1.8), z.literal(2)]);
const weightSchema = z.number().min(25, "Confira o peso informado.").max(350, "Confira o peso informado.");

function validDay(access: AppAccess, date: string): boolean {
  const today = localDateISO(new Date(), access.timezone);
  return isISODate(date) && date <= today && date >= addDays(today, -400);
}

function fail(error: unknown, context: string): ActionResult<never> {
  console.error(`[action:${context}]`, error instanceof Error ? error.message : error);
  return { ok: false, error: GENERIC_ERROR };
}

function revalidateApp() {
  revalidatePath("/", "layout");
}

async function saveTargetHistory(
  db: Awaited<ReturnType<typeof createClient>>,
  access: AppAccess,
  values: { weight_kg: number; protein_factor: number; protein_target_g: number; calorie_target: number | null; fat_target_g: number | null },
) {
  const { error } = await db.from("nutrition_target_history").upsert(
    { user_id: access.user.id, effective_date: localDateISO(new Date(), access.timezone), ...values },
    { onConflict: "user_id,effective_date" },
  );
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------- onboarding

const onboardingSchema = z.object({
  fullName: z.string().trim().min(1, "Informe seu nome.").max(120),
  weightKg: weightSchema,
  factor: factorSchema,
});

export async function completeOnboarding(input: z.input<typeof onboardingSchema>): Promise<ActionResult> {
  const access = await accessForAction();
  if (!access) return { ok: false, error: await actionDeniedMessage() };
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira os dados." };
  const { fullName, weightKg, factor } = parsed.data;
  const target = proteinTarget(weightKg, factor);
  try {
    const db = await createClient();
    const { error: nErr } = await db.from("nutrition_profiles").upsert({
      user_id: access.user.id,
      weight_kg: weightKg,
      protein_factor: factor,
      protein_target_g: target,
    });
    if (nErr) throw new Error(nErr.message);
    await saveTargetHistory(db, access, {
      weight_kg: weightKg,
      protein_factor: factor,
      protein_target_g: target,
      calorie_target: access.nutrition?.calorie_target ?? null,
      fat_target_g: access.nutrition?.fat_target_g ?? null,
    });
    const { error: pErr } = await db
      .from("profiles")
      .update({ full_name: fullName, onboarding_completed_at: new Date().toISOString() })
      .eq("user_id", access.user.id);
    if (pErr) throw new Error(pErr.message);
    await track(db, "onboarding_completed", { factor });
  } catch (e) {
    return fail(e, "onboarding");
  }
  revalidateApp();
  return { ok: true };
}

// ---------------------------------------------------------------- registros

const addEntrySchema = z.object({
  foodId: z.string().uuid(),
  amountG: z.number().gt(0, "Informe a quantidade em gramas.").max(3000, "Confira a quantidade."),
  meal: mealSchema,
  date: z.string(),
});

export async function addFoodEntry(input: z.input<typeof addEntrySchema>): Promise<ActionResult> {
  const access = await accessForAction();
  if (!access) return { ok: false, error: await actionDeniedMessage() };
  const parsed = addEntrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira os dados." };
  if (!validDay(access, parsed.data.date)) return { ok: false, error: "Escolha uma data válida." };
  try {
    const db = await createClient();
    // Os valores nutricionais (snapshot) são preenchidos pelo banco a partir do catálogo.
    const { error } = await db.from("food_entries").insert({
      food_id: parsed.data.foodId,
      amount_g: parsed.data.amountG,
      meal: parsed.data.meal,
      entry_date: parsed.data.date,
    });
    if (error) {
      if (error.message.includes("food_not_available")) {
        return { ok: false, error: "Este alimento não está mais disponível no catálogo." };
      }
      throw new Error(error.message);
    }
    await track(db, "food_added");
  } catch (e) {
    return fail(e, "addFoodEntry");
  }
  revalidateApp();
  return { ok: true, message: "Adicionado ao dia." };
}

const updateEntrySchema = z.object({
  id: z.string().uuid(),
  amountG: z.number().gt(0, "Informe a quantidade em gramas.").max(3000, "Confira a quantidade."),
  meal: mealSchema,
});

export async function updateFoodEntry(input: z.input<typeof updateEntrySchema>): Promise<ActionResult> {
  const access = await accessForAction();
  if (!access) return { ok: false, error: await actionDeniedMessage() };
  const parsed = updateEntrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira os dados." };
  try {
    const db = await createClient();
    const { error, count } = await db
      .from("food_entries")
      .update({ amount_g: parsed.data.amountG, meal: parsed.data.meal }, { count: "exact" })
      .eq("id", parsed.data.id);
    if (error) throw new Error(error.message);
    if (!count) return { ok: false, error: "Registro não encontrado." };
  } catch (e) {
    return fail(e, "updateFoodEntry");
  }
  revalidateApp();
  return { ok: true, message: "Registro atualizado." };
}

export async function deleteFoodEntry(id: string): Promise<ActionResult> {
  const access = await accessForAction();
  if (!access) return { ok: false, error: await actionDeniedMessage() };
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Registro não encontrado." };
  try {
    const db = await createClient();
    const { error } = await db.from("food_entries").delete().eq("id", id);
    if (error) throw new Error(error.message);
  } catch (e) {
    return fail(e, "deleteFoodEntry");
  }
  revalidateApp();
  return { ok: true, message: "Registro removido." };
}

// ---------------------------------------------------------------- favoritos

export async function toggleFavorite(foodId: string): Promise<ActionResult<{ favorite: boolean }>> {
  const access = await accessForAction();
  if (!access) return { ok: false, error: await actionDeniedMessage() };
  if (!z.string().uuid().safeParse(foodId).success) return { ok: false, error: "Alimento não encontrado." };
  try {
    const db = await createClient();
    const { data: existing } = await db.from("favorite_foods").select("food_id").eq("food_id", foodId).maybeSingle();
    if (existing) {
      const { error } = await db.from("favorite_foods").delete().eq("food_id", foodId);
      if (error) throw new Error(error.message);
      revalidateApp();
      return { ok: true, data: { favorite: false } };
    }
    const { error } = await db.from("favorite_foods").insert({ food_id: foodId });
    if (error && error.code !== "23505") throw new Error(error.message);
    await track(db, "favorite_added");
  } catch (e) {
    return fail(e, "toggleFavorite");
  }
  revalidateApp();
  return { ok: true, data: { favorite: true } };
}

// ---------------------------------------------------------------- evolução

const optionalMeasure = z.number().min(30).max(250).nullable();
const checkinSchema = z
  .object({
    date: z.string(),
    weightKg: weightSchema.nullable(),
    waistCm: optionalMeasure,
    abdomenCm: optionalMeasure,
    hipCm: optionalMeasure,
  })
  .refine((v) => v.weightKg !== null || v.waistCm !== null || v.abdomenCm !== null || v.hipCm !== null, {
    message: "Preencha pelo menos uma medida.",
  });

export async function saveCheckin(
  input: z.input<typeof checkinSchema>,
): Promise<ActionResult<{ askRecalculate: boolean; weightKg: number | null; newTarget: number | null }>> {
  const access = await accessForAction();
  if (!access) return { ok: false, error: await actionDeniedMessage() };
  const parsed = checkinSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira as medidas." };
  const v = parsed.data;
  if (!validDay(access, v.date)) return { ok: false, error: "Escolha uma data válida." };
  try {
    const db = await createClient();
    const { error } = await db.from("body_checkins").upsert(
      {
        user_id: access.user.id,
        checkin_date: v.date,
        weight_kg: v.weightKg,
        waist_cm: v.waistCm,
        abdomen_cm: v.abdomenCm,
        hip_cm: v.hipCm,
      },
      { onConflict: "user_id,checkin_date" },
    );
    if (error) throw new Error(error.message);
    await track(db, "body_checkin_added");
  } catch (e) {
    return fail(e, "saveCheckin");
  }
  revalidateApp();
  // Peso diferente do usado na meta: perguntar antes de recalcular (nunca recalcula sozinho).
  // Só pergunta se este é o check-in mais recente (registrar um peso antigo não muda a meta).
  const n = access.nutrition;
  let isLatest = true;
  try {
    const db = await createClient();
    const { data: latest } = await db
      .from("body_checkins")
      .select("checkin_date")
      .not("weight_kg", "is", null)
      .order("checkin_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    isLatest = !latest || v.date >= (latest.checkin_date as string);
  } catch {
    isLatest = false;
  }
  const askRecalculate = Boolean(isLatest && n && v.weightKg !== null && Math.round(Math.abs(v.weightKg - n.weight_kg) * 10) >= 1);
  return {
    ok: true,
    message: "Evolução registrada.",
    data: {
      askRecalculate,
      weightKg: v.weightKg,
      newTarget: askRecalculate && n && v.weightKg ? proteinTarget(v.weightKg, n.protein_factor) : null,
    },
  };
}

export async function deleteCheckin(id: string): Promise<ActionResult> {
  const access = await accessForAction();
  if (!access) return { ok: false, error: await actionDeniedMessage() };
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Registro não encontrado." };
  try {
    const db = await createClient();
    const { error } = await db.from("body_checkins").delete().eq("id", id);
    if (error) throw new Error(error.message);
  } catch (e) {
    return fail(e, "deleteCheckin");
  }
  revalidateApp();
  return { ok: true, message: "Registro removido." };
}

// ---------------------------------------------------------------- metas e perfil

// factor null = manter o fator atual (usado no "Recalcular" após novo peso)
const nutritionSchema = z.object({ weightKg: weightSchema, factor: factorSchema.nullable() });

/** Recalcula a meta com peso/fator informados — só por ação explícita da aluna. */
export async function updateProteinTarget(input: z.input<typeof nutritionSchema>): Promise<ActionResult<{ target: number }>> {
  const access = await accessForAction();
  if (!access?.nutrition) return { ok: false, error: await actionDeniedMessage() };
  const parsed = nutritionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira os dados." };
  const factor = parsed.data.factor ?? access.nutrition.protein_factor;
  const target = proteinTarget(parsed.data.weightKg, factor);
  try {
    const db = await createClient();
    const { error } = await db
      .from("nutrition_profiles")
      .update({ weight_kg: parsed.data.weightKg, protein_factor: factor, protein_target_g: target })
      .eq("user_id", access.user.id);
    if (error) throw new Error(error.message);
    await saveTargetHistory(db, access, {
      weight_kg: parsed.data.weightKg,
      protein_factor: factor,
      protein_target_g: target,
      calorie_target: access.nutrition.calorie_target,
      fat_target_g: access.nutrition.fat_target_g,
    });
  } catch (e) {
    return fail(e, "updateProteinTarget");
  }
  revalidateApp();
  return { ok: true, data: { target }, message: "Meta atualizada." };
}

const goalsSchema = z.object({
  calorieTarget: z.number().int().min(500).max(6000).nullable(),
  fatTargetG: z.number().min(1).max(400).nullable(),
});

export async function updateOptionalGoals(input: z.input<typeof goalsSchema>): Promise<ActionResult> {
  const access = await accessForAction();
  if (!access?.nutrition) return { ok: false, error: await actionDeniedMessage() };
  const parsed = goalsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Confira os valores das metas." };
  try {
    const db = await createClient();
    const { error } = await db
      .from("nutrition_profiles")
      .update({ calorie_target: parsed.data.calorieTarget, fat_target_g: parsed.data.fatTargetG })
      .eq("user_id", access.user.id);
    if (error) throw new Error(error.message);
    await saveTargetHistory(db, access, {
      weight_kg: access.nutrition.weight_kg,
      protein_factor: access.nutrition.protein_factor,
      protein_target_g: access.nutrition.protein_target_g,
      calorie_target: parsed.data.calorieTarget,
      fat_target_g: parsed.data.fatTargetG,
    });
  } catch (e) {
    return fail(e, "updateOptionalGoals");
  }
  revalidateApp();
  return { ok: true, message: "Metas salvas." };
}

export async function updateName(fullName: string): Promise<ActionResult> {
  const access = await accessForAction();
  if (!access) return { ok: false, error: await actionDeniedMessage() };
  const parsed = z.string().trim().min(1, "Informe seu nome.").max(120).safeParse(fullName);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Informe seu nome." };
  try {
    const db = await createClient();
    const { error } = await db.from("profiles").update({ full_name: parsed.data }).eq("user_id", access.user.id);
    if (error) throw new Error(error.message);
  } catch (e) {
    return fail(e, "updateName");
  }
  revalidateApp();
  return { ok: true, message: "Nome atualizado." };
}

