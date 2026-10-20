import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toNumbers } from "../numbers";
import type { BodyCheckin, FoodEntry, FoodItem } from "../types";

export const FOOD_COLUMNS =
  "id, display_name, taco_name, brand, category, preparation, protein_per_100g, calories_per_100g, fat_per_100g, carbohydrate_per_100g, default_serving_g, serving_label, source_type, taco_code";

const FOOD_NUMERIC: (keyof FoodItem)[] = [
  "protein_per_100g",
  "calories_per_100g",
  "fat_per_100g",
  "carbohydrate_per_100g",
  "default_serving_g",
];

export function normalizeFood(row: Record<string, unknown>): FoodItem {
  return toNumbers(row as unknown as FoodItem, FOOD_NUMERIC);
}

const ENTRY_COLUMNS =
  "id, food_id, entry_date, meal, amount_g, food_name_snapshot, preparation_snapshot, protein_per_100g_snapshot, calories_per_100g_snapshot, fat_per_100g_snapshot, carbohydrate_per_100g_snapshot, protein_snapshot, calories_snapshot, fat_snapshot, carbohydrate_snapshot, source_snapshot, consumed_at, created_at";

const ENTRY_NUMERIC: (keyof FoodEntry)[] = [
  "amount_g",
  "protein_per_100g_snapshot",
  "calories_per_100g_snapshot",
  "fat_per_100g_snapshot",
  "carbohydrate_per_100g_snapshot",
  "protein_snapshot",
  "calories_snapshot",
  "fat_snapshot",
  "carbohydrate_snapshot",
];

function normalizeEntry(row: Record<string, unknown>): FoodEntry {
  return toNumbers(row as unknown as FoodEntry, ENTRY_NUMERIC);
}

export async function getEntriesForDay(db: SupabaseClient, date: string): Promise<FoodEntry[]> {
  const { data, error } = await db
    .from("food_entries")
    .select(ENTRY_COLUMNS)
    .eq("entry_date", date)
    .order("consumed_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeEntry);
}

export async function getEntriesBetween(db: SupabaseClient, from: string, to: string): Promise<FoodEntry[]> {
  const { data, error } = await db
    .from("food_entries")
    .select(ENTRY_COLUMNS)
    .gte("entry_date", from)
    .lte("entry_date", to)
    .order("entry_date", { ascending: false })
    .order("consumed_at", { ascending: true })
    .limit(2000);
  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeEntry);
}

export async function getFavorites(db: SupabaseClient): Promise<FoodItem[]> {
  const { data, error } = await db
    .from("favorite_foods")
    .select(`created_at, food:food_catalog (${FOOD_COLUMNS})`)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((r) => (r as unknown as { food: Record<string, unknown> | null }).food)
    .filter((f): f is Record<string, unknown> => Boolean(f))
    .map(normalizeFood);
}

export async function getFavoriteIds(db: SupabaseClient): Promise<string[]> {
  const { data } = await db.from("favorite_foods").select("food_id");
  return (data ?? []).map((r) => r.food_id as string);
}

/** Últimos alimentos distintos usados (para "Usados recentemente"). */
export async function getRecentFoods(db: SupabaseClient, limit = 8): Promise<FoodItem[]> {
  const { data, error } = await db
    .from("food_entries")
    .select("food_id, created_at")
    .not("food_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw new Error(error.message);
  const ids: string[] = [];
  for (const r of data ?? []) {
    const id = r.food_id as string;
    if (!ids.includes(id)) ids.push(id);
    if (ids.length >= limit) break;
  }
  if (ids.length === 0) return [];
  const { data: foods, error: fErr } = await db.from("food_catalog").select(FOOD_COLUMNS).in("id", ids);
  if (fErr) throw new Error(fErr.message);
  const byId = new Map((foods ?? []).map((f) => [f.id as string, normalizeFood(f)]));
  return ids.map((id) => byId.get(id)).filter((f): f is FoodItem => Boolean(f));
}

export interface TargetSnapshot {
  effective_date: string;
  protein_target_g: number;
  calorie_target: number | null;
  fat_target_g: number | null;
}

/** Metas vigentes (histórico), da mais antiga para a mais nova. */
export async function getTargetHistory(db: SupabaseClient): Promise<TargetSnapshot[]> {
  const { data, error } = await db
    .from("nutrition_target_history")
    .select("effective_date, protein_target_g, calorie_target, fat_target_g")
    .order("effective_date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) =>
    toNumbers(r as TargetSnapshot, ["protein_target_g", "calorie_target", "fat_target_g"]),
  );
}

export function targetForDate(history: TargetSnapshot[], date: string): TargetSnapshot | null {
  let found: TargetSnapshot | null = null;
  for (const h of history) {
    if (h.effective_date <= date) found = h;
    else break;
  }
  return found ?? history[0] ?? null;
}

export async function getCheckins(db: SupabaseClient): Promise<BodyCheckin[]> {
  const { data, error } = await db
    .from("body_checkins")
    .select("id, checkin_date, weight_kg, waist_cm, abdomen_cm, hip_cm")
    .order("checkin_date", { ascending: true })
    .limit(400);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) =>
    toNumbers(r as BodyCheckin, ["weight_kg", "waist_cm", "abdomen_cm", "hip_cm"]),
  );
}
