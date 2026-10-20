export type Meal = "breakfast" | "lunch" | "snack" | "dinner" | "supper" | "other";

export const MEALS: { value: Meal; label: string }[] = [
  { value: "breakfast", label: "Café da manhã" },
  { value: "lunch", label: "Almoço" },
  { value: "snack", label: "Lanche" },
  { value: "dinner", label: "Jantar" },
  { value: "supper", label: "Ceia" },
  { value: "other", label: "Outros" },
];

export function mealLabel(meal: Meal | null | undefined): string {
  return MEALS.find((m) => m.value === meal)?.label ?? "Sem refeição";
}

export interface Profile {
  user_id: string;
  email: string;
  full_name: string | null;
  timezone: string;
  onboarding_completed_at: string | null;
}

export interface NutritionProfile {
  user_id: string;
  weight_kg: number;
  protein_factor: number;
  protein_target_g: number;
  calorie_target: number | null;
  fat_target_g: number | null;
}

export interface FoodItem {
  id: string;
  display_name: string;
  taco_name: string | null;
  brand: string | null;
  category: string;
  preparation: string | null;
  protein_per_100g: number;
  calories_per_100g: number;
  fat_per_100g: number | null;
  carbohydrate_per_100g: number | null;
  default_serving_g: number | null;
  serving_label: string | null;
  source_type: "TACO" | "label" | "manual_authorized";
  taco_code: number | null;
}

export interface FoodEntry {
  id: string;
  food_id: string | null;
  entry_date: string;
  meal: Meal | null;
  amount_g: number;
  food_name_snapshot: string;
  preparation_snapshot: string | null;
  protein_per_100g_snapshot: number;
  calories_per_100g_snapshot: number;
  fat_per_100g_snapshot: number | null;
  carbohydrate_per_100g_snapshot: number | null;
  protein_snapshot: number;
  calories_snapshot: number;
  fat_snapshot: number | null;
  carbohydrate_snapshot: number | null;
  source_snapshot: { source_type?: string; taco_code?: number | null; brand?: string | null };
  consumed_at: string;
  created_at: string;
}

export interface BodyCheckin {
  id: string;
  checkin_date: string;
  weight_kg: number | null;
  waist_cm: number | null;
  abdomen_cm: number | null;
  hip_cm: number | null;
}

export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string };
