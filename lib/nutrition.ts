/**
 * Cálculos nutricionais — ÚNICO lugar com estas fórmulas no frontend/servidor.
 * (O banco repete a mesma fórmula no trigger food_entries_snapshot para garantir
 * a integridade do snapshot; os testes conferem que os dois coincidem.)
 *
 * Regras de arredondamento (somente na exibição; o banco guarda 3 casas):
 *   proteína: 1 casa decimal · gordura: 1 casa decimal · calorias: inteiro
 *   carboidrato: 1 casa decimal
 */

export const PROTEIN_FACTORS = [1.5, 1.8, 2.0] as const;
export type ProteinFactor = (typeof PROTEIN_FACTORS)[number];

export function isProteinFactor(value: number): value is ProteinFactor {
  return (PROTEIN_FACTORS as readonly number[]).includes(value);
}

/** Arredondamento "meio para cima" sem ruído de ponto flutuante. */
export function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(Number((value * factor).toPrecision(12))) / factor;
}

/** Meta diária de proteína = peso (kg) × fator (g/kg), com 1 casa decimal. */
export function proteinTarget(weightKg: number, factor: number): number {
  if (!Number.isFinite(weightKg) || weightKg <= 0) throw new Error("Peso inválido");
  if (!isProteinFactor(factor)) throw new Error("Fator de proteína inválido");
  return round(weightKg * factor, 1);
}

/** Nutriente consumido = (valor por 100 g / 100) × quantidade em gramas. */
export function nutrientForAmount(per100g: number | null | undefined, amountG: number): number | null {
  if (per100g === null || per100g === undefined) return null;
  if (!Number.isFinite(amountG) || amountG < 0) throw new Error("Quantidade inválida");
  return (per100g / 100) * amountG;
}

export interface Per100g {
  protein_per_100g: number | null;
  calories_per_100g: number | null;
  fat_per_100g: number | null;
  carbohydrate_per_100g?: number | null;
}

export interface Consumed {
  protein: number;
  calories: number;
  fat: number | null;
  carbohydrate: number | null;
}

export function consumedFor(food: Per100g, amountG: number): Consumed {
  return {
    protein: nutrientForAmount(food.protein_per_100g, amountG) ?? 0,
    calories: nutrientForAmount(food.calories_per_100g, amountG) ?? 0,
    fat: nutrientForAmount(food.fat_per_100g, amountG),
    carbohydrate: nutrientForAmount(food.carbohydrate_per_100g ?? null, amountG),
  };
}

export interface EntryTotals {
  protein_snapshot: number | string;
  calories_snapshot: number | string;
  fat_snapshot: number | string | null;
  carbohydrate_snapshot?: number | string | null;
}

/** Soma os snapshots salvos (valores do PostgREST podem chegar como string). */
export function sumEntries(entries: EntryTotals[]): Consumed {
  let protein = 0;
  let calories = 0;
  let fat = 0;
  let carbohydrate = 0;
  for (const e of entries) {
    protein += Number(e.protein_snapshot) || 0;
    calories += Number(e.calories_snapshot) || 0;
    fat += Number(e.fat_snapshot ?? 0) || 0;
    carbohydrate += Number(e.carbohydrate_snapshot ?? 0) || 0;
  }
  return { protein, calories, fat, carbohydrate };
}

export interface Progress {
  target: number;
  consumed: number;
  remaining: number;
  percent: number;
  reached: boolean;
}

export function progress(target: number, consumed: number): Progress {
  const t = round(target, 1);
  const c = round(consumed, 1);
  const remaining = Math.max(0, round(t - c, 1));
  return {
    target: t,
    consumed: c,
    remaining,
    percent: t > 0 ? Math.min(100, Math.round((c / t) * 100)) : 0,
    reached: t > 0 && c >= t,
  };
}

const fmt1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
const fmt0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export const format = {
  protein: (g: number) => `${fmt1.format(round(g, 1))} g`,
  fat: (g: number) => `${fmt1.format(round(g, 1))} g`,
  carbohydrate: (g: number) => `${fmt1.format(round(g, 1))} g`,
  calories: (kcal: number) => `${fmt0.format(round(kcal, 0))} kcal`,
  grams: (g: number) => `${fmt1.format(round(g, 1))} g`,
  number1: (n: number) => fmt1.format(round(n, 1)),
  factor: (f: number) => `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1 }).format(f)} g/kg`,
};

/** Converte texto digitado ("120", "120,5", "1.5") em número; null se inválido. */
export function parseDecimal(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  const cleaned = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
