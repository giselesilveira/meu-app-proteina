/**
 * npm run taco:build
 *
 * Lê data/taco/Taco_4a_edicao_2011.xls (arquivo oficial) + data/taco/curation.json
 * e gera:
 *   - data/taco/taco-foods.json            (catálogo normalizado, revisável)
 *   - supabase/seed/taco_food_catalog.sql  (carga idempotente para o SQL Editor)
 *
 * Pode ser executado quantas vezes quiser: o SQL usa upsert por taco_code.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseTacoWorkbook, TACO_SOURCE_REFERENCE, type TacoFood } from "./lib/taco-parse";

const root = path.resolve(__dirname, "..");
const xlsPath = path.join(root, "data/taco/Taco_4a_edicao_2011.xls");
const curationPath = path.join(root, "data/taco/curation.json");
const jsonOut = path.join(root, "data/taco/taco-foods.json");
const sqlOut = path.join(root, "supabase/seed/taco_food_catalog.sql");

interface Curation {
  foods: Record<string, { display_name?: string; aliases?: string[]; default_serving_g?: number; serving_label?: string }>;
}

export interface CatalogFood extends TacoFood {
  display_name: string;
  aliases: string[];
  default_serving_g: number | null;
  serving_label: string | null;
}

function sqlText(v: string | null): string {
  return v === null ? "null" : `'${v.replace(/'/g, "''")}'`;
}
function sqlNum(v: number | null): string {
  return v === null ? "null" : String(v);
}

function main() {
  const buffer = readFileSync(xlsPath);
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const curation = JSON.parse(readFileSync(curationPath, "utf8")) as Curation;
  const parsed = parseTacoWorkbook(buffer);

  if (parsed.length !== 597) {
    throw new Error(`Esperados 597 alimentos na TACO 4ª edição, encontrados ${parsed.length}.`);
  }

  const known = new Set(parsed.map((f) => String(f.taco_code)));
  for (const code of Object.keys(curation.foods)) {
    if (!known.has(code)) throw new Error(`curation.json referencia código TACO inexistente: ${code}`);
  }

  const foods: CatalogFood[] = parsed.map((f) => {
    const c = curation.foods[String(f.taco_code)] ?? {};
    const display_name = c.display_name ?? f.taco_name;
    // o nome amigável precisa conter a preparação oficial (aceita variação de gênero: grelhado/grelhada)
    const prepStem = f.preparation?.replace(/ \(10 minutos\)/, "").replace(/[oa]s?$/, "");
    if (prepStem && !display_name.toLowerCase().includes(prepStem)) {
      throw new Error(`Nome amigável de ${f.taco_code} omite a preparação "${f.preparation}": ${display_name}`);
    }
    return {
      ...f,
      display_name,
      aliases: c.aliases ?? [],
      default_serving_g: c.default_serving_g ?? null,
      serving_label: c.serving_label ?? null,
    };
  });

  writeFileSync(
    jsonOut,
    JSON.stringify(
      {
        source: TACO_SOURCE_REFERENCE,
        file: "Taco_4a_edicao_2011.xls",
        sha256,
        generated_by: "scripts/build-taco.ts",
        rules: {
          rounding: "kcal e sódio inteiros; proteína, lipídeos, carboidrato e fibra com 1 casa (igual ao PDF oficial)",
          Tr: "traço => 0",
          NA: "não aplicável => 0",
          asterisk: "em reavaliação => null (alimento inativo se afetar energia/proteína/lipídeos)",
          blank: "análise não solicitada => null",
        },
        foods,
      },
      null,
      2,
    ) + "\n",
  );

  const lines: string[] = [
    "-- GERADO AUTOMATICAMENTE por scripts/build-taco.ts — não edite à mão.",
    `-- Fonte: ${TACO_SOURCE_REFERENCE}`,
    `-- Arquivo: data/taco/Taco_4a_edicao_2011.xls (sha256 ${sha256})`,
    "-- Idempotente: pode ser executado novamente sem duplicar registros.",
    "begin;",
  ];
  for (const f of foods) {
    lines.push(
      `insert into public.food_catalog (name, display_name, taco_name, category, preparation, protein_per_100g, calories_per_100g, fat_per_100g, carbohydrate_per_100g, fiber_per_100g, sodium_mg_per_100g, default_serving_g, serving_label, source_type, source_reference, taco_code, source_flags, added_by, is_active) values (` +
        [
          sqlText(f.taco_name),
          sqlText(f.display_name),
          sqlText(f.taco_name),
          sqlText(f.category),
          sqlText(f.preparation),
          sqlNum(f.protein_per_100g),
          sqlNum(f.calories_per_100g),
          sqlNum(f.fat_per_100g),
          sqlNum(f.carbohydrate_per_100g),
          sqlNum(f.fiber_per_100g),
          sqlNum(f.sodium_mg_per_100g),
          sqlNum(f.default_serving_g),
          sqlText(f.serving_label),
          "'TACO'",
          sqlText(TACO_SOURCE_REFERENCE),
          String(f.taco_code),
          `${sqlText(JSON.stringify(f.flags))}::jsonb`,
          "'import-taco'",
          f.is_active ? "true" : "false",
        ].join(", ") +
        `) on conflict (taco_code) do update set name = excluded.name, display_name = excluded.display_name, taco_name = excluded.taco_name, category = excluded.category, preparation = excluded.preparation, protein_per_100g = excluded.protein_per_100g, calories_per_100g = excluded.calories_per_100g, fat_per_100g = excluded.fat_per_100g, carbohydrate_per_100g = excluded.carbohydrate_per_100g, fiber_per_100g = excluded.fiber_per_100g, sodium_mg_per_100g = excluded.sodium_mg_per_100g, default_serving_g = coalesce(excluded.default_serving_g, public.food_catalog.default_serving_g), serving_label = coalesce(excluded.serving_label, public.food_catalog.serving_label), source_reference = excluded.source_reference, source_flags = excluded.source_flags, is_active = excluded.is_active;`,
    );
    for (const alias of f.aliases) {
      lines.push(
        `insert into public.food_aliases (food_id, alias) select id, ${sqlText(alias)} from public.food_catalog where taco_code = ${f.taco_code} on conflict (food_id, alias_normalized) do nothing;`,
      );
    }
  }
  lines.push("commit;", "");
  writeFileSync(sqlOut, lines.join("\n"));

  const active = foods.filter((f) => f.is_active).length;
  console.log(`TACO: ${foods.length} alimentos (${active} ativos, ${foods.length - active} pendentes).`);
  console.log(`sha256 ${sha256}`);
  console.log(`-> ${path.relative(root, jsonOut)}\n-> ${path.relative(root, sqlOut)}`);
}

main();
