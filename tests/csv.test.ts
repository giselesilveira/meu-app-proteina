import { describe, expect, it } from "vitest";
import { parseCsv, validateFoodCsv } from "@/lib/csv";

const HEADER =
  "display_name;brand;category;preparation;protein_per_100g;calories_per_100g;fat_per_100g;carbohydrate_per_100g;fiber_per_100g;sodium_mg_per_100g;default_serving_g;serving_label;source_type;source_reference";

describe("CSV administrativo", () => {
  it("aceita ; e vírgula decimal (Excel pt-BR) e aspas", () => {
    expect(parseCsv('a;b\n"x;1";"2,5"\n')).toEqual([
      ["a", "b"],
      ["x;1", "2,5"],
    ]);
  });
  it("valida e converte uma linha de rótulo", () => {
    const r = validateFoodCsv(`${HEADER}\nWhey X;Marca Y;Suplementos;pó;80;400;6,5;8;;150;30;1 scoop;label;Rótulo lote 2026`);
    expect(r.errors).toEqual([]);
    expect(r.rows[0]).toMatchObject({ protein_per_100g: 80, fat_per_100g: 6.5, fiber_per_100g: null, default_serving_g: 30 });
  });
  it("rejeita linha de exemplo, TACO, falta de fonte, marca e valores impossíveis", () => {
    const r = validateFoodCsv(
      [
        HEADER,
        "EXEMPLO - apague esta linha;M;S;;0;0;0;0;0;0;30;;label;Rótulo",
        "Frango;;Carnes;;30;150;2;0;0;0;;;TACO;tabela",
        "Barra;Marca;Lanches;;20;300;5;30;0;0;;;label;",
        "Iogurte;;Laticínios;;10;60;2;3;0;0;;;label;Rótulo",
        "Pó;Marca;Suplementos;;90;400;20;10;0;0;;;label;Rótulo",
        "Bolo;;Doces;;-1;300;5;30;0;0;;;manual_authorized;Equipe",
      ].join("\n"),
    );
    expect(r.rows).toHaveLength(0);
    expect(r.errors.map((e) => e.line)).toEqual([2, 3, 4, 5, 6, 7]);
  });
  it("exige colunas obrigatórias", () => {
    expect(validateFoodCsv("display_name;category\nA;B").errors[0].message).toMatch(/colunas obrigatórias/);
  });
});
