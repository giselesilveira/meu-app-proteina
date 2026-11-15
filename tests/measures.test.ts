import { describe, expect, it } from "vitest";
import { ALTERNATE_MEASURES, alternateMeasureFor, gramsFromQuantity } from "@/lib/measures";
import { consumedFor, round } from "@/lib/nutrition";

// Proteína por 100 g do catálogo original (mesmos valores do SQL).
const PER100: Record<string, number> = {
  "Ovos Cozidos": 13, "Queijo Minas": 18, "Whey Protein": 80, "Ovos de Codorna": 13,
  "Iogurte do Tambo": 4.8, "Proteína do Colágeno": 90, "Beef Protein": 90, "Clara de Ovo (de galinha)": 11,
};

/** Simula o trigger do banco: amount_g numeric(7,2) e protein_snapshot numeric(9,3). */
function dbProtein(per100: number, grams: number) {
  return round((per100 / 100) * round(grams, 2), 3);
}

describe("medidas alternativas", () => {
  it("cobre os 8 alimentos da calculadora original", () => {
    expect(Object.keys(ALTERNATE_MEASURES).sort()).toEqual(Object.keys(PER100).sort());
  });

  for (const [name, per100] of Object.entries(PER100)) {
    const m = alternateMeasureFor(name, per100)!;
    for (const qty of [1, 2, 3, 0.5, 1.5, 10]) {
      it(`${name}: ${qty} × ${m.unit} = ${round(m.protein * qty, 2)} g de proteína (prévia = banco)`, () => {
        const grams = gramsFromQuantity(qty, "units", m);
        const preview = consumedFor({ protein_per_100g: per100, calories_per_100g: 0, fat_per_100g: null }, grams).protein;
        expect(round(preview, 1)).toBe(round(m.protein * qty, 1));
        expect(round(dbProtein(per100, grams), 1)).toBe(round(preview, 1));
      });
    }
  }

  it("pote de Iogurte do Tambo = 200 g", () => {
    expect(alternateMeasureFor("Iogurte do Tambo", 4.8)!.gramsPerUnit).toBeCloseTo(200, 9);
  });
  it("modo gramas não converte", () => {
    expect(gramsFromQuantity(120.5, "grams", alternateMeasureFor("Whey Protein", 80))).toBe(120.5);
  });
  it("alimento sem medida alternativa", () => {
    expect(alternateMeasureFor("Peito de Frango", 31)).toBeNull();
  });
});
