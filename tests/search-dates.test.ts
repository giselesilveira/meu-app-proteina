import { describe, expect, it } from "vitest";
import { addDays, isCheckinDay, isISODate, localDateISO } from "@/lib/dates";
import { normalizeEmail, isValidEmail, parseEmailList } from "@/lib/email";
import { filterFoods, searchTokens } from "@/lib/search";

describe("termos de busca", () => {
  it("ignora acento, caixa, ordem e gênero", () => {
    expect(searchTokens("Peito de Frango Grelhado")).toEqual(["peit", "frang", "grelhad"]);
    expect(searchTokens("frango grelhada")).toEqual(["frang", "grelhad"]);
    expect(searchTokens("Carne moída")).toEqual(["carne", "moid"]);
    expect(searchTokens("ovos")).toEqual(["ovo"]);
    expect(searchTokens("  ")).toEqual([]);
  });
});

describe("fuso horário America/Sao_Paulo", () => {
  it("23h50 em São Paulo continua no mesmo dia (UTC já virou)", () => {
    const instant = new Date("2026-10-21T02:50:00Z"); // 20/10 23:50 em SP (UTC-3)
    expect(localDateISO(instant, "America/Sao_Paulo")).toBe("2026-10-20");
    expect(localDateISO(instant, "UTC")).toBe("2026-10-21");
  });
  it("fuso inválido cai no padrão", () => {
    expect(localDateISO(new Date("2026-10-21T02:50:00Z"), "Nada/Inexistente")).toBe("2026-10-20");
  });
  it("utilidades de data", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(isISODate("2026-02-30")).toBe(false);
    expect(isISODate("2026-10-20")).toBe(true);
    expect(isCheckinDay("2026-10-19")).toBe(true); // segunda
    expect(isCheckinDay("2026-10-23")).toBe(true); // sexta
    expect(isCheckinDay("2026-10-21")).toBe(false);
  });
});

describe("e-mail", () => {
  it("normaliza com trim + lowercase", () => {
    expect(normalizeEmail("  Maria.Silva@Gmail.COM ")).toBe("maria.silva@gmail.com");
    expect(isValidEmail("x@y.com")).toBe(true);
    expect(isValidEmail("sem-arroba")).toBe(false);
    expect(parseEmailList(" A@b.com, c@D.com ,")).toEqual(["a@b.com", "c@d.com"]);
  });
});

describe("menu de alimentos (filtro local)", () => {
  const foods = ["Peito de Frango", "Ovos Cozidos", "Coxa de Frango", "Clara de Ovo (de galinha)", "Ovos de Codorna", "Camarão", "Iogurte do Tambo"].map(
    (display_name) => ({ display_name }),
  );
  it("sem texto: lista completa em ordem alfabética", () => {
    expect(filterFoods(foods, "").map((f) => f.display_name)).toEqual([
      "Camarão", "Clara de Ovo (de galinha)", "Coxa de Frango", "Iogurte do Tambo", "Ovos Cozidos", "Ovos de Codorna", "Peito de Frango",
    ]);
  });
  it("filtra ignorando acentos e plural, com quem começa pelo termo primeiro", () => {
    expect(filterFoods(foods, "ovos").map((f) => f.display_name)).toEqual(["Ovos Cozidos", "Ovos de Codorna", "Clara de Ovo (de galinha)"]);
    expect(filterFoods(foods, "camarao").map((f) => f.display_name)).toEqual(["Camarão"]);
    expect(filterFoods(foods, "frango peito").map((f) => f.display_name)).toEqual(["Peito de Frango"]);
  });
  it("sem resultado", () => {
    expect(filterFoods(foods, "arroz")).toEqual([]);
  });
});
