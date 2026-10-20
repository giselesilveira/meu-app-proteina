/**
 * npm run taco:import
 *
 * Alternativa ao SQL (supabase/seed/taco_food_catalog.sql): envia o catálogo TACO
 * gerado por `npm run taco:build` direto para o Supabase usando a service role.
 * Idempotente: upsert por taco_code; aliases sem duplicar.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { adminClientFromEnv } from "./lib/env";
import { TACO_SOURCE_REFERENCE } from "./lib/taco-parse";
import type { CatalogFood } from "./build-taco";

async function main() {
  const db = adminClientFromEnv();
  const { foods } = JSON.parse(readFileSync(path.resolve(__dirname, "../data/taco/taco-foods.json"), "utf8")) as {
    foods: CatalogFood[];
  };

  for (let i = 0; i < foods.length; i += 100) {
    const batch = foods.slice(i, i + 100).map((f) => ({
      name: f.taco_name,
      display_name: f.display_name,
      taco_name: f.taco_name,
      category: f.category,
      preparation: f.preparation,
      protein_per_100g: f.protein_per_100g,
      calories_per_100g: f.calories_per_100g,
      fat_per_100g: f.fat_per_100g,
      carbohydrate_per_100g: f.carbohydrate_per_100g,
      fiber_per_100g: f.fiber_per_100g,
      sodium_mg_per_100g: f.sodium_mg_per_100g,
      source_type: "TACO",
      source_reference: TACO_SOURCE_REFERENCE,
      taco_code: f.taco_code,
      source_flags: f.flags,
      added_by: "import-taco",
      is_active: f.is_active,
    }));
    const { error } = await db.from("food_catalog").upsert(batch, { onConflict: "taco_code" });
    if (error) throw new Error(error.message);
    console.log(`alimentos ${i + 1}–${i + batch.length} ok`);
  }

  const { data: ids, error } = await db.from("food_catalog").select("id, taco_code").not("taco_code", "is", null);
  if (error) throw new Error(error.message);
  const byCode = new Map(ids.map((r) => [r.taco_code as number, r.id as string]));
  const aliases = foods.flatMap((f) => f.aliases.map((alias) => ({ food_id: byCode.get(f.taco_code)!, alias })));
  if (aliases.length) {
    const { error: aErr } = await db
      .from("food_aliases")
      .upsert(aliases, { onConflict: "food_id,alias_normalized", ignoreDuplicates: true });
    if (aErr) throw new Error(aErr.message);
  }
  console.log(`TACO importada: ${foods.length} alimentos, ${aliases.length} termos de busca.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
