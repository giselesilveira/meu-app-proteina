import { AddFoodForm, CsvImport, FoodRowActions } from "@/components/admin/foods";
import { Card, Notice } from "@/components/ui";
import { requireAdmin } from "@/lib/access";
import { searchTokens } from "@/lib/search";
import { createAdminClient } from "@/lib/supabase/admin";
import { withBasePath } from "@/lib/public-config";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  display_name: string;
  taco_name: string | null;
  brand: string | null;
  category: string;
  preparation: string | null;
  protein_per_100g: number | null;
  calories_per_100g: number | null;
  fat_per_100g: number | null;
  default_serving_g: number | null;
  serving_label: string | null;
  source_type: string;
  source_reference: string;
  taco_code: number | null;
  added_by: string | null;
  added_at: string;
  is_active: boolean;
  source_flags: Record<string, string>;
  food_aliases: { alias: string }[];
}

export default async function AdminFoodsPage({ searchParams }: { searchParams: Promise<{ q?: string; origem?: string; inativos?: string }> }) {
  await requireAdmin();
  const { q = "", origem = "", inativos = "" } = await searchParams;
  const db = createAdminClient();
  let query = db
    .from("food_catalog")
    .select(
      "id, display_name, taco_name, brand, category, preparation, protein_per_100g, calories_per_100g, fat_per_100g, default_serving_g, serving_label, source_type, source_reference, taco_code, added_by, added_at, is_active, source_flags, food_aliases(alias)",
    )
    .order("display_name")
    .limit(60);
  for (const t of searchTokens(q)) query = query.ilike("search_blob", `%${t.replace(/[%_]/g, "")}%`);
  if (origem) query = query.eq("source_type", origem);
  if (inativos === "1") query = query.eq("is_active", false);
  const { data, error } = await query;
  const rows = (data ?? []) as Row[];

  return (
    <div className="space-y-8">
      <Card className="p-5">
        <h2 className="text-lg font-bold">Adicionar alimento (rótulo ou validado pela equipe)</h2>
        <p className="mb-4 text-mute">
          Valores sempre por 100 g, copiados do rótulo ou da referência validada. Nunca estime valores. Alimentos da TACO entram apenas
          pelo importador oficial.
        </p>
        <AddFoodForm />
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-bold">Importar CSV</h2>
        <p className="mb-4 text-mute">
          Baixe o{" "}
          <a className="font-semibold underline" href={withBasePath("/templates/alimentos-modelo.csv")} download>
            modelo de CSV
          </a>
          . Todas as linhas são validadas antes de gravar; com qualquer erro, nada é importado.
        </p>
        <CsvImport />
      </Card>

      <section>
        <form className="mb-4 flex flex-wrap gap-2" role="search">
          <input name="q" defaultValue={q} className="input max-w-md flex-1" placeholder="Buscar no catálogo" aria-label="Buscar no catálogo" />
          <select name="origem" defaultValue={origem} className="input w-52" aria-label="Origem">
            <option value="">Todas as origens</option>
            <option value="TACO">TACO</option>
            <option value="label">Rótulo</option>
            <option value="manual_authorized">Validado pela equipe</option>
          </select>
          <label className="flex items-center gap-2 px-2 text-sm font-semibold">
            <input type="checkbox" name="inativos" value="1" defaultChecked={inativos === "1"} className="h-5 w-5" /> Só inativos/pendentes
          </label>
          <button className="min-h-[56px] rounded-xl bg-ink px-6 font-semibold text-cream">Filtrar</button>
        </form>
        {error ? <Notice tone="error">Não foi possível carregar o catálogo.</Notice> : null}
        <div className="overflow-x-auto rounded-2xl border border-sand bg-ivory">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-sand/60 text-xs uppercase tracking-wider text-cocoa">
              <tr>
                <th className="px-3 py-3">Alimento</th>
                <th className="px-3 py-3">Por 100 g</th>
                <th className="px-3 py-3">Origem nutricional</th>
                <th className="px-3 py-3">Situação</th>
                <th className="px-3 py-3">Editar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {rows.map((f) => (
                <tr key={f.id} className="align-top">
                  <td className="px-3 py-3">
                    <p className="font-semibold">{f.display_name}</p>
                    {f.taco_name && f.taco_name !== f.display_name ? <p className="text-xs text-mute">TACO: {f.taco_name}</p> : null}
                    <p className="text-xs text-mute">
                      {f.category}
                      {f.brand ? ` · ${f.brand}` : ""}
                      {f.preparation ? ` · ${f.preparation}` : ""}
                    </p>
                  </td>
                  <td className="tabular px-3 py-3 text-xs">
                    <p>Prot. {f.protein_per_100g ?? "—"} g</p>
                    <p>{f.calories_per_100g ?? "—"} kcal</p>
                    <p>Gord. {f.fat_per_100g ?? "—"} g</p>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <p className="font-semibold">
                      {f.source_type}
                      {f.taco_code ? ` nº ${f.taco_code}` : ""}
                    </p>
                    <p className="text-mute">{f.source_reference}</p>
                    {f.added_by && f.source_type !== "TACO" ? <p className="text-mute">por {f.added_by}</p> : null}
                    {Object.keys(f.source_flags ?? {}).length ? (
                      <p className="text-mute">marcações TACO: {Object.entries(f.source_flags).map(([k, v]) => `${k.replace(/_per_100g|_mg/g, "")}=${v}`).join(", ")}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-xs font-bold">{f.is_active ? "ativo" : "inativo / pendente"}</td>
                  <td className="px-3 py-3">
                    <FoodRowActions
                      food={{
                        id: f.id,
                        display_name: f.display_name,
                        default_serving_g: f.default_serving_g,
                        serving_label: f.serving_label,
                        aliases: f.food_aliases.map((a) => a.alias),
                        is_active: f.is_active,
                      }}
                    />
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-mute">
                    Nenhum alimento encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
