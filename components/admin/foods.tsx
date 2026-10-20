"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addFood, editFood, importFoodsCsv, setFoodActive } from "@/app/admin/actions";
import { FOOD_CSV_COLUMNS } from "@/lib/csv";
import { parseDecimal } from "@/lib/nutrition";
import { Button, Notice } from "../ui";

const LABELS: Record<(typeof FOOD_CSV_COLUMNS)[number], string> = {
  display_name: "Nome (com preparação, se houver) *",
  brand: "Marca (obrigatória para rótulo)",
  category: "Categoria *",
  preparation: "Preparação / estado",
  protein_per_100g: "Proteína g/100 g *",
  calories_per_100g: "Calorias kcal/100 g *",
  fat_per_100g: "Gorduras g/100 g",
  carbohydrate_per_100g: "Carboidratos g/100 g",
  fiber_per_100g: "Fibras g/100 g",
  sodium_mg_per_100g: "Sódio mg/100 g",
  default_serving_g: "Porção padrão (g)",
  serving_label: "Nome da porção (ex.: 1 scoop)",
  source_type: "Origem *",
  source_reference: "Fonte / referência (rótulo, lote, quem conferiu) *",
};

export function AddFoodForm() {
  const router = useRouter();
  const empty = Object.fromEntries(FOOD_CSV_COLUMNS.map((c) => [c, c === "source_type" ? "label" : ""])) as Record<string, string>;
  const [values, setValues] = useState(empty);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await addFood(values);
          setMsg(r.ok ? { tone: "success", text: r.message ?? "Salvo." } : { tone: "error", text: r.error });
          if (r.ok) {
            setValues(empty);
            router.refresh();
          }
        });
      }}
      className="grid gap-3 sm:grid-cols-2"
    >
      {FOOD_CSV_COLUMNS.map((c) => (
        <div key={c}>
          <label className="label" htmlFor={`af-${c}`}>
            {LABELS[c]}
          </label>
          {c === "source_type" ? (
            <select id={`af-${c}`} className="input" value={values[c]} onChange={(e) => setValues((v) => ({ ...v, [c]: e.target.value }))}>
              <option value="label">Rótulo do produto</option>
              <option value="manual_authorized">Validado pela equipe da Nutri Gisele</option>
            </select>
          ) : (
            <input
              id={`af-${c}`}
              className="input"
              inputMode={c.includes("_per_100g") || c === "default_serving_g" ? "decimal" : undefined}
              value={values[c]}
              onChange={(e) => setValues((v) => ({ ...v, [c]: e.target.value }))}
            />
          )}
        </div>
      ))}
      <div className="sm:col-span-2">
        {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
        <Button type="submit" loading={pending} className="mt-3">
          Cadastrar alimento
        </Button>
      </div>
    </form>
  );
}

export function CsvImport() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [report, setReport] = useState<{ valid: number; errors: { line: number; message: string }[] } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3">
      <input
        type="file"
        accept=".csv,text/csv"
        aria-label="Arquivo CSV"
        className="block text-sm"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          setReport(null);
          setMsg(null);
          setContent(file ? await file.text() : "");
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={!content}
          loading={pending}
          onClick={() =>
            start(async () => {
              const r = await importFoodsCsv(content, false);
              if (r.ok && r.data) setReport(r.data);
              else if (!r.ok) setMsg(r.error);
            })
          }
        >
          Validar
        </Button>
        <Button
          disabled={!report || report.errors.length > 0 || report.valid === 0}
          loading={pending}
          onClick={() =>
            start(async () => {
              const r = await importFoodsCsv(content, true);
              setMsg(r.ok ? (r.message ?? "Importado.") : r.error);
              if (r.ok) {
                setReport(null);
                router.refresh();
              }
            })
          }
        >
          Importar
        </Button>
      </div>
      {report ? (
        report.errors.length ? (
          <Notice tone="error">
            <p className="font-semibold">{report.errors.length} problema(s) encontrados. Corrija e valide de novo:</p>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {report.errors.slice(0, 30).map((e, i) => (
                <li key={i}>
                  Linha {e.line}: {e.message}
                </li>
              ))}
            </ul>
          </Notice>
        ) : (
          <Notice tone="success">{report.valid} linha(s) válidas, prontas para importar.</Notice>
        )
      ) : null}
      {msg ? <Notice>{msg}</Notice> : null}
    </div>
  );
}

export function FoodRowActions({
  food,
}: {
  food: { id: string; display_name: string; default_serving_g: number | null; serving_label: string | null; aliases: string[]; is_active: boolean };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(food.display_name);
  const [serving, setServing] = useState(food.default_serving_g ? String(food.default_serving_g) : "");
  const [servingLabel, setServingLabel] = useState(food.serving_label ?? "");
  const [aliases, setAliases] = useState(food.aliases.join(", "));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button variant="secondary" className="min-h-[40px] px-3 text-sm" onClick={() => setOpen((o) => !o)}>
          {open ? "Fechar" : "Editar"}
        </Button>
        <Button
          variant={food.is_active ? "danger" : "secondary"}
          className="min-h-[40px] px-3 text-sm"
          loading={pending}
          onClick={() =>
            start(async () => {
              const r = await setFoodActive(food.id, !food.is_active);
              setMsg(r.ok ? (r.message ?? "") : r.error);
              router.refresh();
            })
          }
        >
          {food.is_active ? "Desativar" : "Ativar"}
        </Button>
      </div>
      {open ? (
        <form
          className="w-72 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await editFood({
                id: food.id,
                display_name: name,
                default_serving_g: serving.trim() ? parseDecimal(serving) : null,
                serving_label: servingLabel.trim() || null,
                aliases: aliases
                  .split(",")
                  .map((a) => a.trim())
                  .filter((a) => a.length >= 2),
              });
              setMsg(r.ok ? (r.message ?? "") : r.error);
              if (r.ok) router.refresh();
            });
          }}
        >
          <input className="input min-h-[44px] text-sm" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome exibido" />
          <input className="input min-h-[44px] text-sm" value={serving} onChange={(e) => setServing(e.target.value)} placeholder="Porção padrão (g)" aria-label="Porção padrão em gramas" />
          <input className="input min-h-[44px] text-sm" value={servingLabel} onChange={(e) => setServingLabel(e.target.value)} placeholder="Nome da porção" aria-label="Nome da porção" />
          <input className="input min-h-[44px] text-sm" value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder="Termos de busca, separados por vírgula" aria-label="Termos de busca" />
          <Button type="submit" className="min-h-[40px] w-full text-sm" loading={pending}>
            Salvar
          </Button>
        </form>
      ) : null}
      {msg ? <p className="text-xs text-mute">{msg}</p> : null}
    </div>
  );
}
