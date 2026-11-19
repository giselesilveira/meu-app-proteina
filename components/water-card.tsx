"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { addWater, deleteWater } from "@/app/(app)/actions";
import { format } from "@/lib/nutrition";
import { WATER_ML_PER_KG, WATER_QUICK, formatWater, parseWaterMl, waterProgress } from "@/lib/water";
import { IconCheck, IconDrop, IconTrash } from "./icons";
import { Button, Notice } from "./ui";

export interface WaterItem {
  id: string;
  amountMl: number;
  /** Horário já formatado no fuso da aluna (ex.: "10:32"). */
  time: string;
}

export function WaterCard({
  date,
  goalMl,
  weightKg,
  items,
  title = "Água de hoje",
}: {
  date: string;
  goalMl: number;
  weightKg: number;
  items: WaterItem[];
  title?: string;
}) {
  const router = useRouter();
  const inputId = useId();
  const consumed = items.reduce((sum, i) => sum + i.amountMl, 0);
  const p = waterProgress(goalMl, consumed);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [removing, setRemoving] = useState<string | null>(null);
  const customMl = parseWaterMl(custom);

  function add(ml: number) {
    setError(null);
    startTransition(async () => {
      const res = await addWater({ amountMl: ml, date });
      if (!res.ok) return setError(res.error);
      setCustom("");
      router.refresh();
    });
  }

  function remove(id: string) {
    setError(null);
    setRemoving(id);
    startTransition(async () => {
      const res = await deleteWater(id);
      setRemoving(null);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  return (
    <section aria-labelledby={`${inputId}-titulo`} className="card p-5">
      <h2 id={`${inputId}-titulo`} className="flex items-center gap-2 text-lg font-bold">
        <IconDrop size={22} className="text-[#3f86b0]" /> {title}
      </h2>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className="text-[0.8125rem] font-semibold text-mute">Meta</dt>
          <dd className="tabular mt-1 text-[1.2rem] font-bold">{formatWater(p.goal)}</dd>
        </div>
        <div>
          <dt className="text-[0.8125rem] font-semibold text-mute">Bebido</dt>
          <dd className="tabular mt-1 text-[1.2rem] font-bold text-[#3f86b0]">{formatWater(p.consumed)}</dd>
        </div>
        <div>
          <dt className="text-[0.8125rem] font-semibold text-mute">Faltam</dt>
          <dd className="tabular mt-1 text-[1.2rem] font-bold">{formatWater(p.remaining)}</dd>
        </div>
      </dl>

      <div
        className="mt-4 h-3 overflow-hidden rounded-full bg-sand"
        role="progressbar"
        aria-label="Progresso da meta de água"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={p.percent}
      >
        <div className="h-full rounded-full bg-[#3f86b0] transition-all" style={{ width: `${p.percent}%` }} />
      </div>
      <p className="mt-2 text-sm text-mute">
        {p.reached ? (
          <span className="inline-flex items-center gap-1 font-semibold text-[#2f6f95]">
            <IconCheck size={16} /> Meta de água atingida
          </span>
        ) : (
          <>{p.percent}% da meta</>
        )}
        <span> · {WATER_ML_PER_KG} ml × {format.number1(weightKg)} kg</span>
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {WATER_QUICK.map((q) => (
          <button
            key={q.ml}
            type="button"
            disabled={pending}
            onClick={() => add(q.ml)}
            className="flex min-h-[56px] flex-col items-center justify-center rounded-xl border border-[#3f86b0]/35 bg-[#3f86b0]/10 px-3 font-semibold text-ink hover:bg-[#3f86b0]/15 disabled:opacity-50"
          >
            <span>+ 1 {q.label.toLowerCase()}</span>
            <span className="text-sm font-normal text-mute">{q.ml} ml</span>
          </button>
        ))}
      </div>

      <div className="mt-3">
        <label htmlFor={inputId} className="label">
          Outra quantidade (ml)
        </label>
        <div className="flex gap-2">
          <input
            id={inputId}
            className="input min-w-0 flex-1"
            inputMode="numeric"
            placeholder="Ex.: 300"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && customMl && add(customMl)}
          />
          <Button type="button" variant="secondary" className="shrink-0 px-5" disabled={!customMl || pending} onClick={() => customMl && add(customMl)}>
            Adicionar
          </Button>
        </div>
        {custom.trim() && !customMl ? (
          <p className="mt-2 text-sm font-semibold text-danger" role="alert">
            Digite um número entre 1 e 5000 ml.
          </p>
        ) : null}
      </div>

      {error ? (
        <div className="mt-3">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}

      {items.length > 0 ? (
        <ul className="mt-4 divide-y divide-sand/80 rounded-xl border border-sand">
          {[...items].reverse().map((i) => (
            <li key={i.id} className="flex min-h-[52px] items-center justify-between gap-3 px-4">
              <span className="tabular">
                <strong>{formatWater(i.amountMl)}</strong> <span className="text-sm text-mute">· {i.time}</span>
              </span>
              <button
                type="button"
                onClick={() => remove(i.id)}
                disabled={pending}
                aria-label={`Remover ${formatWater(i.amountMl)} das ${i.time}`}
                className="inline-flex min-h-[44px] items-center gap-1 px-2 text-sm font-semibold text-cocoa hover:text-danger disabled:opacity-50"
              >
                <IconTrash size={18} /> {removing === i.id ? "Removendo…" : "Remover"}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
