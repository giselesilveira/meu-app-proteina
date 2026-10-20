import { z } from "zod";

/** CSV simples (RFC 4180): aceita separador "," ou ";" (Excel em português) e aspas. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

export const FOOD_CSV_COLUMNS = [
  "display_name",
  "brand",
  "category",
  "preparation",
  "protein_per_100g",
  "calories_per_100g",
  "fat_per_100g",
  "carbohydrate_per_100g",
  "fiber_per_100g",
  "sodium_mg_per_100g",
  "default_serving_g",
  "serving_label",
  "source_type",
  "source_reference",
] as const;

const REQUIRED = ["display_name", "category", "protein_per_100g", "calories_per_100g", "source_type", "source_reference"];

const num = (max: number) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      const n = Number(v.replace(",", "."));
      if (!Number.isFinite(n) || n < 0 || n > max) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `valor inválido "${v}"` });
        return z.NEVER;
      }
      return n;
    });

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));

export const foodCsvRowSchema = z
  .object({
    display_name: z.string().trim().min(2, "nome obrigatório").max(140),
    brand: text(80),
    category: z.string().trim().min(2, "categoria obrigatória").max(80),
    preparation: text(60),
    protein_per_100g: num(100),
    calories_per_100g: num(900),
    fat_per_100g: num(100),
    carbohydrate_per_100g: num(100),
    fiber_per_100g: num(100),
    sodium_mg_per_100g: num(40000),
    default_serving_g: num(2000),
    serving_label: text(40),
    source_type: z.enum(["label", "manual_authorized"], {
      errorMap: () => ({ message: 'source_type deve ser "label" ou "manual_authorized" (TACO só pelo importador oficial)' }),
    }),
    source_reference: z.string().trim().min(3, "fonte/referência obrigatória").max(300),
  })
  .superRefine((v, ctx) => {
    if (/^exemplo\b/i.test(v.display_name)) ctx.addIssue({ code: "custom", message: "linha de exemplo do modelo: apague antes de importar", path: ["display_name"] });
    if (v.protein_per_100g === null) ctx.addIssue({ code: "custom", message: "proteína obrigatória", path: ["protein_per_100g"] });
    if (v.calories_per_100g === null) ctx.addIssue({ code: "custom", message: "calorias obrigatórias", path: ["calories_per_100g"] });
    if (v.source_type === "label" && !v.brand) ctx.addIssue({ code: "custom", message: "produto de rótulo precisa da marca", path: ["brand"] });
    if (v.default_serving_g === 0) ctx.addIssue({ code: "custom", message: "porção deve ser maior que zero", path: ["default_serving_g"] });
    const macros = (v.protein_per_100g ?? 0) + (v.fat_per_100g ?? 0) + (v.carbohydrate_per_100g ?? 0) + (v.fiber_per_100g ?? 0);
    if (macros > 100.5) ctx.addIssue({ code: "custom", message: "soma de macronutrientes acima de 100 g por 100 g", path: ["protein_per_100g"] });
  });

export type FoodCsvRow = z.output<typeof foodCsvRowSchema>;

export interface CsvValidation {
  rows: FoodCsvRow[];
  errors: { line: number; message: string }[];
}

export function validateFoodCsv(content: string): CsvValidation {
  const table = parseCsv(content);
  const errors: { line: number; message: string }[] = [];
  if (table.length < 2) return { rows: [], errors: [{ line: 1, message: "arquivo sem linhas de dados" }] };
  const header = table[0].map((h) => h.trim().toLowerCase());
  const missing = REQUIRED.filter((c) => !header.includes(c));
  if (missing.length) return { rows: [], errors: [{ line: 1, message: `colunas obrigatórias ausentes: ${missing.join(", ")}` }] };
  const unknown = header.filter((h) => !(FOOD_CSV_COLUMNS as readonly string[]).includes(h));
  if (unknown.length) errors.push({ line: 1, message: `colunas ignoradas: ${unknown.join(", ")}` });

  const rows: FoodCsvRow[] = [];
  table.slice(1).forEach((cells, i) => {
    const record: Record<string, string> = {};
    for (const col of FOOD_CSV_COLUMNS) {
      const idx = header.indexOf(col);
      record[col] = idx >= 0 ? (cells[idx] ?? "") : "";
    }
    const parsed = foodCsvRowSchema.safeParse(record);
    if (parsed.success) rows.push(parsed.data);
    else errors.push({ line: i + 2, message: parsed.error.issues.map((x) => `${x.path.join(".") || "linha"}: ${x.message}`).join("; ") });
  });
  return { rows, errors };
}
