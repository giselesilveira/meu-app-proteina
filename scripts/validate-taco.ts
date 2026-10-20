/**
 * npm run taco:validate
 *
 * Confere o catálogo gerado (data/taco/taco-foods.json, vindo da planilha oficial)
 * contra o TEXTO do PDF oficial da TACO 4ª edição (data/taco/taco_4_edicao_ampliada_e_revisada.pdf).
 * São duas fontes independentes publicadas pelo NEPA/UNICAMP.
 *
 * Requer o utilitário `pdftotext` (pacote poppler-utils).
 * Gera data/taco/validation-report.json e imprime um resumo.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const pdf = path.join(root, "data/taco/taco_4_edicao_ampliada_e_revisada.pdf");
const catalog = JSON.parse(readFileSync(path.join(root, "data/taco/taco-foods.json"), "utf8")) as {
  foods: Array<{
    taco_code: number;
    taco_name: string;
    calories_per_100g: number | null;
    protein_per_100g: number | null;
    fat_per_100g: number | null;
    carbohydrate_per_100g: number | null;
    fiber_per_100g: number | null;
    sodium_mg_per_100g: number | null;
  }>;
};

function pdfNumber(token: string | undefined): number | null | undefined {
  if (token === undefined) return undefined;
  if (token === "Tr" || token === "NA") return 0;
  if (token === "*") return null;
  const n = Number(token.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

const text = execFileSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const lines = text.split("\n");

const VALUE = String.raw`(?:-?\d+(?:,\d+)?[a-z]?|Tr|NA|\*)`;
const centesimal = new Map<number, string[]>();
const sodiumFromPdf = new Map<number, string>();
const rowWithName = new RegExp(String.raw`^\s*(\d{1,3})\s+(\S.*?\S)\s{2,}((?:${VALUE}\s+)*${VALUE})\s*$`);
const rowOnlyValues = new RegExp(String.raw`^\s*(\d{1,3})\s+((?:${VALUE}\s+)*${VALUE})\s*$`);

// Na tabela de minerais há células em branco; por isso o sódio é localizado pela
// POSIÇÃO horizontal da coluna "Sódio" no cabeçalho (pdftotext -layout preserva colunas).
let mineralHeader: { center: number; neighbours: number[] } | null = null;
const centerOf = (line: string, word: string) => {
  const i = line.indexOf(word);
  return i < 0 ? -1 : i + word.length / 2;
};

for (const line of lines) {
  if (line.includes("Sódio") && line.includes("Ferro") && line.includes("Potássio")) {
    mineralHeader = {
      center: centerOf(line, "Sódio"),
      neighbours: [centerOf(line, "Ferro"), centerOf(line, "Potássio")],
    };
    continue;
  }
  if (/Saturados|Triptofano|graxos/i.test(line)) mineralHeader = null; // saiu da tabela de minerais

  const named = rowWithName.exec(line);
  if (named && /[A-Za-zÀ-ú]{3,}/.test(named[2])) {
    const id = Number(named[1]);
    if (!centesimal.has(id)) centesimal.set(id, named[3].split(/\s+/));
    continue;
  }
  const values = rowOnlyValues.exec(line);
  if (values && mineralHeader) {
    const id = Number(values[1]);
    if (!centesimal.has(id) || sodiumFromPdf.has(id)) continue;
    const tokens = [...line.matchAll(/\S+/g)].slice(1).map((m) => ({ text: m[0], center: m.index! + m[0].length / 2 }));
    const best = tokens.reduce((a, b) =>
      Math.abs(b.center - mineralHeader!.center) < Math.abs(a.center - mineralHeader!.center) ? b : a,
    );
    const dist = Math.abs(best.center - mineralHeader.center);
    const closerToNeighbour = mineralHeader.neighbours.some((n) => Math.abs(best.center - n) < dist);
    if (!closerToNeighbour) sodiumFromPdf.set(id, best.text.replace(/[a-z]$/, ""));
  }
}

type Field = "calories_per_100g" | "protein_per_100g" | "fat_per_100g" | "carbohydrate_per_100g" | "fiber_per_100g" | "sodium_mg_per_100g";
interface Result {
  taco_code: number;
  taco_name: string;
  checked: Partial<Record<Field, { catalog: number | null; pdf: number | null }>>;
  mismatches: Field[];
  skipped: string[];
}

const results: Result[] = [];
for (const food of catalog.foods) {
  const r: Result = { taco_code: food.taco_code, taco_name: food.taco_name, checked: {}, mismatches: [], skipped: [] };
  const row = centesimal.get(food.taco_code);
  // Ordem no PDF: umidade, kcal, kJ, proteína, lipídeos, colesterol, carboidrato, fibra, cinzas, Ca, Mg
  if (row && row.length === 11) {
    const map: Array<[Field, number]> = [
      ["calories_per_100g", 1],
      ["protein_per_100g", 3],
      ["fat_per_100g", 4],
      ["carbohydrate_per_100g", 6],
      ["fiber_per_100g", 7],
    ];
    for (const [field, idx] of map) {
      const pdfValue = pdfNumber(row[idx]);
      if (pdfValue === undefined) continue;
      r.checked[field] = { catalog: food[field], pdf: pdfValue };
      if (pdfValue !== food[field]) r.mismatches.push(field);
    }
  } else {
    r.skipped.push(`linha centesimal com ${row?.length ?? 0} colunas (célula em branco no PDF)`);
  }
  // Minerais: Mn, P, Fe, Na, K, Cu, Zn, ...
  const naToken = sodiumFromPdf.get(food.taco_code);
  if (naToken !== undefined) {
    const pdfNa = pdfNumber(naToken);
    if (pdfNa !== undefined) {
      r.checked.sodium_mg_per_100g = { catalog: food.sodium_mg_per_100g, pdf: pdfNa };
      if (pdfNa !== food.sodium_mg_per_100g) r.mismatches.push("sodium_mg_per_100g");
    }
  } else {
    r.skipped.push("sódio não localizado com segurança no PDF (célula em branco)");
  }
  results.push(r);
}

const withMismatch = results.filter((r) => r.mismatches.length > 0);
const fullyChecked = results.filter((r) => r.skipped.length === 0 && r.mismatches.length === 0);
const valuesChecked = results.reduce((n, r) => n + Object.keys(r.checked).length, 0);

writeFileSync(
  path.join(root, "data/taco/validation-report.json"),
  JSON.stringify({ generated_at: new Date().toISOString(), valuesChecked, results }, null, 2) + "\n",
);

console.log(`Alimentos: ${results.length}`);
console.log(`Valores conferidos contra o PDF: ${valuesChecked}`);
console.log(`Alimentos conferidos por completo, sem divergência: ${fullyChecked.length}`);
console.log(`Alimentos com divergência: ${withMismatch.length}`);
for (const r of withMismatch) {
  console.log(
    `  ${r.taco_code} ${r.taco_name}: ` +
      r.mismatches.map((f) => `${f} catálogo=${r.checked[f]?.catalog} pdf=${r.checked[f]?.pdf}`).join("; "),
  );
}
if (withMismatch.length > 0) process.exitCode = 1;
