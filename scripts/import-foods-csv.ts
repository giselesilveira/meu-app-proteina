/**
 * npm run foods:import-csv -- caminho/arquivo.csv [--aplicar] [--responsavel=email]
 *
 * Importa alimentos de RÓTULO (source_type=label) ou VALIDADOS pela equipe
 * (manual_authorized) a partir do modelo data/templates/alimentos-modelo.csv.
 * Sem --aplicar, apenas valida. Com qualquer erro, nada é gravado.
 */
import { readFileSync } from "node:fs";
import { validateFoodCsv } from "../lib/csv";
import { adminClientFromEnv } from "./lib/env";

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Informe o arquivo CSV.");
  const apply = process.argv.includes("--aplicar");
  const who = process.argv.find((a) => a.startsWith("--responsavel="))?.split("=")[1] ?? "script-csv";
  const { rows, errors } = validateFoodCsv(readFileSync(file, "utf8"));
  for (const e of errors) console.log(`linha ${e.line}: ${e.message}`);
  console.log(`${rows.length} linha(s) válidas, ${errors.length} problema(s).`);
  if (errors.length || !apply) return;

  const db = adminClientFromEnv();
  for (const r of rows) {
    const row = {
      ...r,
      name: r.brand ? `${r.display_name} (${r.brand})` : r.display_name,
      added_by: who,
      added_at: new Date().toISOString(),
      is_active: true,
    };
    let q = db.from("food_catalog").select("id").eq("display_name", r.display_name).eq("source_type", r.source_type);
    q = r.brand ? q.eq("brand", r.brand) : q.is("brand", null);
    const { data: existing } = await q.maybeSingle();
    const { error } = existing ? await db.from("food_catalog").update(row).eq("id", existing.id) : await db.from("food_catalog").insert(row);
    if (error) throw new Error(`${r.display_name}: ${error.message}`);
  }
  console.log(`${rows.length} alimento(s) gravados.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
