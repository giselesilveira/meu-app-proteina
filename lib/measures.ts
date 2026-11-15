/**
 * Medidas alternativas da calculadora original (unidade, scoop, pote).
 * A conversão usa a proteína da medida e a proteína por 100 g do catálogo:
 *   gramas equivalentes = proteína da medida / proteína por 100 g × 100
 * As gramas são arredondadas a 2 casas, a mesma precisão da coluna
 * food_entries.amount_g (numeric(7,2)), para que a prévia exibida seja
 * idêntica ao valor que o banco calcula e salva.
 */
import { round } from "./nutrition";

export interface AlternateMeasure {
  /** Rótulo do botão e do campo (ex.: "Scoops"). */
  label: string;
  /** Singular, para textos de ajuda (ex.: "1 scoop"). */
  unit: string;
  /** Proteína de 1 medida, conforme a calculadora original. */
  protein: number;
}

export const ALTERNATE_MEASURES: Record<string, AlternateMeasure> = {
  "Ovos Cozidos": { label: "Unidades", unit: "unidade", protein: 6 },
  "Queijo Minas": { label: "Unidades", unit: "unidade", protein: 7 },
  "Whey Protein": { label: "Scoops", unit: "scoop", protein: 20 },
  "Ovos de Codorna": { label: "Unidades", unit: "unidade", protein: 1.3 },
  "Iogurte do Tambo": { label: "Potes (200 g)", unit: "pote de 200 g", protein: 9.6 },
  "Proteína do Colágeno": { label: "Scoops", unit: "scoop", protein: 20 },
  "Beef Protein": { label: "Scoops", unit: "scoop", protein: 25 },
  "Clara de Ovo (de galinha)": { label: "Unidades", unit: "unidade", protein: 3.6 },
};

export function alternateMeasureFor(
  displayName: string,
  proteinPer100g: number | null | undefined,
): (AlternateMeasure & { gramsPerUnit: number }) | null {
  const m = ALTERNATE_MEASURES[displayName];
  if (!m || !proteinPer100g || proteinPer100g <= 0) return null;
  return { ...m, gramsPerUnit: (m.protein / proteinPer100g) * 100 };
}

/** Quantidade digitada → gramas a salvar (2 casas, como no banco). */
export function gramsFromQuantity(
  quantity: number,
  mode: "grams" | "units",
  measure: { gramsPerUnit: number } | null,
): number {
  const raw = mode === "units" && measure ? quantity * measure.gramsPerUnit : quantity;
  return round(raw, 2);
}
