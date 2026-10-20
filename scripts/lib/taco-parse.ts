/**
 * Leitura da planilha oficial TACO 4ª edição (NEPA/UNICAMP, 2011) e normalização.
 *
 * Regras (documentadas em TACO_SETUP.md):
 * - valores arredondados na mesma precisão publicada no PDF oficial:
 *   kcal e sódio inteiros; proteína, lipídeos, carboidrato e fibra com 1 casa;
 * - "Tr" (traço: abaixo do limite de quantificação/arredondamento) => 0;
 * - "NA" (não aplicável: o nutriente não existe naquele alimento) => 0;
 * - "*" (análise em reavaliação) e células em branco (análise não solicitada) => null;
 * - alimento com energia, proteína ou lipídeos em "*" ou em branco fica inativo (pendente).
 * Nenhum valor é estimado: todos saem da planilha ou ficam nulos.
 */
import * as XLSX from "xlsx";

export const TACO_SOURCE_REFERENCE =
  "Tabela Brasileira de Composição de Alimentos — TACO, 4ª edição revisada e ampliada (NEPA/UNICAMP, 2011)";

export type TacoFlag = "Tr" | "NA" | "*" | "blank";

export interface TacoFood {
  taco_code: number;
  taco_name: string;
  category: string;
  preparation: string | null;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  fat_per_100g: number | null;
  carbohydrate_per_100g: number | null;
  fiber_per_100g: number | null;
  sodium_mg_per_100g: number | null;
  flags: Record<string, TacoFlag>;
  is_active: boolean;
}

const COLUMNS = {
  code: 0,
  name: 1,
  kcal: 3,
  protein: 5,
  fat: 6,
  carbohydrate: 8,
  fiber: 9,
  sodium: 17,
} as const;

const NUTRIENTS = [
  ["calories_per_100g", COLUMNS.kcal, 0],
  ["protein_per_100g", COLUMNS.protein, 1],
  ["fat_per_100g", COLUMNS.fat, 1],
  ["carbohydrate_per_100g", COLUMNS.carbohydrate, 1],
  ["fiber_per_100g", COLUMNS.fiber, 1],
  ["sodium_mg_per_100g", COLUMNS.sodium, 0],
] as const;

type NutrientKey = (typeof NUTRIENTS)[number][0];

// Palavras de preparo/estado usadas nos nomes oficiais da TACO.
const PREPARATION_WORDS = [
  "cru", "crua", "crus", "cruas",
  "cozido", "cozida", "cozidos", "cozidas",
  "grelhado", "grelhada", "grelhados", "grelhadas",
  "assado", "assada", "assados", "assadas",
  "frito", "frita", "fritos", "fritas",
  "refogado", "refogada", "refogados", "refogadas",
  "ensopado", "ensopada",
  "à milanesa",
  "torrado", "torrada", "torrados", "torradas",
  "congelado", "congelada",
  "desidratado", "desidratada",
  "em conserva", "conserva em óleo", "em calda",
  "fresco", "fresca",
  "pré-cozida", "pré-cozido",
];

/** Arredondamento "meio para cima" sem erro de ponto flutuante (ex.: 2,45 -> 2,5). */
export function roundHalfUp(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  // toPrecision remove o ruído binário (ex.: 2.45 * 10 = 24.499999...) antes de arredondar.
  return Math.round(Number((value * factor).toPrecision(12))) / factor;
}

export function cleanName(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/,(?=\S)/g, ", ")
    .replace(/\s+(\d)$/, "") // nota de rodapé ¹/² exportada como dígito (ex.: "Cana, aguardente 1")
    .trim();
}

export function detectPreparation(name: string): string | null {
  const parts = name
    .toLowerCase()
    .split(",")
    .map((p) => p.trim());
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i].replace(/\/\s*10\s*minutos/, "");
    if (PREPARATION_WORDS.includes(part)) {
      return parts[i].includes("10minutos") || parts[i].includes("10 minutos")
        ? `${part} (10 minutos)`
        : part;
    }
  }
  return null;
}

function parseCell(value: unknown, decimals: number): { value: number | null; flag?: TacoFlag } {
  if (typeof value === "number" && Number.isFinite(value)) return { value: roundHalfUp(value, decimals) };
  if (value === null || value === undefined || String(value).trim() === "") return { value: null, flag: "blank" };
  const text = String(value).trim();
  if (text === "Tr") return { value: 0, flag: "Tr" };
  if (text === "NA") return { value: 0, flag: "NA" };
  if (text === "*") return { value: null, flag: "*" };
  throw new Error(`Valor inesperado na planilha TACO: "${text}"`);
}

export function parseTacoWorkbook(buffer: Buffer): TacoFood[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets["CMVCol taco3"];
  if (!sheet) throw new Error('Aba "CMVCol taco3" não encontrada. Confira se é o arquivo oficial da TACO 4ª edição.');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });

  const foods: TacoFood[] = [];
  let category = "";
  for (const row of rows) {
    const first = row[COLUMNS.code];
    const second = row[COLUMNS.name];
    if (typeof first === "string" && second === null && !/^(Número|Legenda|\*|†)/.test(first.trim())) {
      // linha de seção (ex.: "Carnes e derivados")
      if (row.slice(2).every((c) => c === null)) category = first.trim();
      continue;
    }
    if (typeof first !== "number" || typeof second !== "string") continue;

    const taco_name = cleanName(second);
    const flags: Record<string, TacoFlag> = {};
    const values = {} as Record<NutrientKey, number | null>;
    for (const [key, column, decimals] of NUTRIENTS) {
      const parsed = parseCell(row[column], decimals);
      values[key] = parsed.value;
      if (parsed.flag) flags[key] = parsed.flag;
    }
    const core: NutrientKey[] = ["calories_per_100g", "protein_per_100g", "fat_per_100g"];
    const is_active = core.every((k) => values[k] !== null) && flags.calories_per_100g !== "NA";

    foods.push({
      taco_code: first,
      taco_name,
      category,
      preparation: detectPreparation(taco_name),
      ...values,
      flags,
      is_active,
    });
  }
  return foods;
}
