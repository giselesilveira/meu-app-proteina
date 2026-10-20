import { describe, expect, it } from "vitest";
import {
  consumedFor,
  format,
  nutrientForAmount,
  parseDecimal,
  progress,
  proteinTarget,
  round,
  sumEntries,
} from "@/lib/nutrition";

describe("meta de proteína (peso × fator)", () => {
  it("fator 1,5", () => expect(proteinTarget(70, 1.5)).toBe(105));
  it("fator 1,8", () => expect(proteinTarget(70, 1.8)).toBe(126));
  it("fator 2,0", () => expect(proteinTarget(70, 2.0)).toBe(140));
  it("peso decimal", () => expect(proteinTarget(68.4, 1.8)).toBe(123.1));
  it("rejeita fator fora da lista", () => expect(() => proteinTarget(70, 1.6)).toThrow());
  it("rejeita peso inválido", () => {
    expect(() => proteinTarget(0, 1.5)).toThrow();
    expect(() => proteinTarget(Number.NaN, 1.5)).toThrow();
  });
});

describe("cálculo proporcional por gramas", () => {
  it("exemplo do enunciado: 30 g/100 g × 120 g = 36 g", () => {
    expect(nutrientForAmount(30, 120)).toBe(36);
  });
  it("proteína, calorias e gordura do peito de frango grelhado (TACO 410) em 120 g", () => {
    const c = consumedFor({ protein_per_100g: 32.0, calories_per_100g: 159, fat_per_100g: 2.5 }, 120);
    expect(round(c.protein, 1)).toBe(38.4);
    expect(round(c.calories, 0)).toBe(191);
    expect(round(c.fat!, 1)).toBe(3);
  });
  it("quantidades decimais", () => {
    expect(round(nutrientForAmount(13.3, 45.5)!, 1)).toBe(6.1);
  });
  it("alimento com valor zero", () => {
    const c = consumedFor({ protein_per_100g: 0, calories_per_100g: 884, fat_per_100g: 100 }, 10);
    expect(c.protein).toBe(0);
    expect(c.calories).toBeCloseTo(88.4);
    expect(c.fat).toBe(10);
  });
  it("nutriente ausente fica nulo (não é inventado)", () => {
    expect(nutrientForAmount(null, 100)).toBeNull();
    expect(consumedFor({ protein_per_100g: 10, calories_per_100g: 50, fat_per_100g: null }, 100).fat).toBeNull();
  });
  it("rejeita quantidade negativa", () => expect(() => nutrientForAmount(10, -1)).toThrow());
});

describe("arredondamento", () => {
  it("meio para cima sem erro binário", () => {
    expect(round(2.45, 1)).toBe(2.5);
    expect(round(1.005, 2)).toBe(1.01);
    expect(round(190.5, 0)).toBe(191);
  });
  it("formatação pt-BR", () => {
    expect(format.protein(38.44)).toBe("38,4 g");
    expect(format.protein(36)).toBe("36 g");
    expect(format.calories(190.8)).toBe("191 kcal");
    expect(format.factor(1.5)).toBe("1,5 g/kg");
    expect(format.factor(2)).toBe("2,0 g/kg");
  });
  it("aceita vírgula ou ponto na digitação", () => {
    expect(parseDecimal("120,5")).toBe(120.5);
    expect(parseDecimal("1.8")).toBe(1.8);
    expect(parseDecimal("abc")).toBeNull();
    expect(parseDecimal("-3")).toBeNull();
  });
});

describe("somatório e progresso", () => {
  it("soma snapshots vindos do banco como texto", () => {
    const t = sumEntries([
      { protein_snapshot: "38.400", calories_snapshot: "190.800", fat_snapshot: "3.000" },
      { protein_snapshot: 6.65, calories_snapshot: 73, fat_snapshot: null },
    ]);
    expect(round(t.protein, 1)).toBe(45.1);
    expect(round(t.calories, 0)).toBe(264);
    expect(t.fat).toBe(3);
  });
  it("faltam e meta atingida", () => {
    expect(progress(110, 78)).toMatchObject({ remaining: 32, reached: false, percent: 71 });
    const done = progress(110, 115);
    expect(done.remaining).toBe(0);
    expect(done.reached).toBe(true);
    expect(done.percent).toBe(100);
  });
});
