"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteFoodEntry, updateFoodEntry } from "@/app/(app)/actions";
import { consumedFor, format, parseDecimal } from "@/lib/nutrition";
import { MEALS, mealLabel, type FoodEntry, type Meal } from "@/lib/types";
import { IconEdit, IconPlus, IconTrash } from "./icons";
import { Button, ButtonLink, EmptyState, Notice } from "./ui";

export function EntryList({ entries, emptyHref }: { entries: FoodEntry[]; emptyHref?: string }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="Nenhum alimento registrado"
        action={
          emptyHref ? (
            <ButtonLink href={emptyHref} variant="secondary">
              <IconPlus size={20} /> Registrar o primeiro
            </ButtonLink>
          ) : undefined
        }
      >
        Registre o que você comeu para acompanhar sua proteína do dia.
      </EmptyState>
    );
  }

  const hasMeals = entries.some((e) => e.meal);
  if (!hasMeals) {
    return (
      <ul className="card divide-y divide-sand/80">
        {entries.map((e) => (
          <EntryRow key={e.id} entry={e} />
        ))}
      </ul>
    );
  }

  const groups = [...MEALS.map((m) => m.value), null].map((meal) => ({
    meal,
    items: entries.filter((e) => (e.meal ?? null) === meal),
  }));
  return (
    <div className="space-y-4">
      {groups
        .filter((g) => g.items.length > 0)
        .map((g) => (
          <div key={g.meal ?? "none"}>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-taupe">{mealLabel(g.meal as Meal | null)}</p>
            <ul className="card divide-y divide-sand/80">
              {g.items.map((e) => (
                <EntryRow key={e.id} entry={e} />
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}

function EntryRow({ entry }: { entry: FoodEntry }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [amount, setAmount] = useState(String(entry.amount_g).replace(".", ","));
  const [meal, setMeal] = useState<Meal | null>(entry.meal);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const grams = parseDecimal(amount);
  // Edição usa os valores por 100 g CONGELADOS no registro (snapshot), não o catálogo atual.
  const preview =
    grams && grams > 0
      ? consumedFor(
          {
            protein_per_100g: entry.protein_per_100g_snapshot,
            calories_per_100g: entry.calories_per_100g_snapshot,
            fat_per_100g: entry.fat_per_100g_snapshot,
          },
          grams,
        )
      : null;

  function save() {
    setError(null);
    if (!grams || grams <= 0) return setError("Informe a quantidade em gramas.");
    startTransition(async () => {
      const res = await updateFoodEntry({ id: entry.id, amountG: grams, meal });
      if (!res.ok) return setError(res.error);
      setEditing(false);
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteFoodEntry(entry.id);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  return (
    <li className="px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold leading-snug">{entry.food_name_snapshot}</p>
          <p className="tabular text-[0.95rem] text-mute">
            {format.grams(entry.amount_g)} · {format.calories(entry.calories_snapshot)}
            {entry.fat_snapshot !== null ? ` · ${format.fat(entry.fat_snapshot)} gord.` : ""}
          </p>
        </div>
        <p className="tabular shrink-0 text-right text-[1.15rem] font-bold text-copper-dark">{format.protein(entry.protein_snapshot)}</p>
      </div>

      {!editing && !confirming ? (
        <div className="mt-2 flex gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-[0.95rem] font-semibold text-cocoa hover:bg-sand/60"
            aria-label={`Editar ${entry.food_name_snapshot}`}
          >
            <IconEdit size={18} /> Editar
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-[0.95rem] font-semibold text-cocoa hover:bg-sand/60"
            aria-label={`Excluir ${entry.food_name_snapshot}`}
          >
            <IconTrash size={18} /> Excluir
          </button>
        </div>
      ) : null}

      {confirming ? (
        <div className="mt-3 rounded-xl bg-sand/50 p-3">
          <p className="font-semibold">Excluir este registro?</p>
          <div className="mt-3 flex gap-2">
            <Button variant="danger" onClick={remove} loading={pending} className="flex-1">
              Excluir
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending} className="flex-1">
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}

      {editing ? (
        <div className="mt-3 space-y-3 rounded-xl bg-sand/40 p-3">
          <label className="label" htmlFor={`amount-${entry.id}`}>
            Quantidade (gramas)
          </label>
          <input
            id={`amount-${entry.id}`}
            className="input"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <label className="label" htmlFor={`meal-${entry.id}`}>
            Refeição (opcional)
          </label>
          <select
            id={`meal-${entry.id}`}
            className="input"
            value={meal ?? ""}
            onChange={(e) => setMeal((e.target.value || null) as Meal | null)}
          >
            <option value="">Sem refeição</option>
            {MEALS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          {preview ? (
            <p className="tabular text-[0.95rem] text-cocoa">
              Proteína {format.protein(preview.protein)} · {format.calories(preview.calories)}
              {preview.fat !== null ? ` · Gordura ${format.fat(preview.fat)}` : ""}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button onClick={save} loading={pending} className="flex-1">
              Salvar
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)} disabled={pending} className="flex-1">
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-3">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}
    </li>
  );
}
