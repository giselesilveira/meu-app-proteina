"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateName, updateOptionalGoals, updateProteinTarget } from "@/app/(app)/actions";
import { format, isProteinFactor, parseDecimal, proteinTarget } from "@/lib/nutrition";
import { FactorPicker } from "./factor-picker";
import { Button, Notice } from "./ui";

function useResult() {
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  return { msg, setMsg };
}

export function NameForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [pending, start] = useTransition();
  const { msg, setMsg } = useResult();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updateName(name);
          setMsg(res.ok ? { tone: "success", text: res.message ?? "Salvo." } : { tone: "error", text: res.error });
          if (res.ok) router.refresh();
        });
      }}
    >
      <label htmlFor="full-name" className="label">
        Nome
      </label>
      <div className="flex gap-2">
        <input id="full-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
        <Button type="submit" variant="secondary" loading={pending} disabled={name.trim() === initialName.trim()}>
          Salvar
        </Button>
      </div>
      {msg ? (
        <div className="mt-3">
          <Notice tone={msg.tone}>{msg.text}</Notice>
        </div>
      ) : null}
    </form>
  );
}

export function ProteinForm({ weightKg, factor }: { weightKg: number; factor: number }) {
  const router = useRouter();
  const [weight, setWeight] = useState(String(weightKg).replace(".", ","));
  const [f, setF] = useState<number>(factor);
  const [pending, start] = useTransition();
  const { msg, setMsg } = useResult();
  const w = parseDecimal(weight);
  const preview = w && w >= 25 && w <= 350 && isProteinFactor(f) ? proteinTarget(w, f) : null;
  const changed = w !== weightKg || f !== factor;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!preview || !w) return setMsg({ tone: "error", text: "Confira o peso informado." });
        start(async () => {
          const res = await updateProteinTarget({ weightKg: w, factor: f as 1.5 | 1.8 | 2 });
          setMsg(res.ok ? { tone: "success", text: `Meta atualizada para ${format.protein(res.data!.target)}.` } : { tone: "error", text: res.error });
          if (res.ok) router.refresh();
        });
      }}
      className="space-y-4"
    >
      <div>
        <label htmlFor="weight" className="label">
          Peso usado no cálculo (kg)
        </label>
        <input id="weight" className="input" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
      </div>
      <FactorPicker value={f} onChange={setF} />
      {preview && changed ? (
        <p className="rounded-xl bg-sand/50 px-4 py-3">
          Nova meta diária: <strong className="tabular">{format.protein(preview)}</strong>
        </p>
      ) : null}
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      <Button type="submit" loading={pending} disabled={!changed} className="w-full">
        Atualizar meta
      </Button>
    </form>
  );
}

export function GoalsForm({ calorieTarget, fatTargetG }: { calorieTarget: number | null; fatTargetG: number | null }) {
  const router = useRouter();
  const [kcal, setKcal] = useState(calorieTarget ? String(calorieTarget) : "");
  const [fat, setFat] = useState(fatTargetG ? String(fatTargetG).replace(".", ",") : "");
  const [pending, start] = useTransition();
  const { msg, setMsg } = useResult();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const k = kcal.trim() ? parseDecimal(kcal) : null;
        const g = fat.trim() ? parseDecimal(fat) : null;
        if ((kcal.trim() && k === null) || (fat.trim() && g === null)) {
          return setMsg({ tone: "error", text: "Use apenas números." });
        }
        start(async () => {
          const res = await updateOptionalGoals({ calorieTarget: k === null ? null : Math.round(k), fatTargetG: g });
          setMsg(res.ok ? { tone: "success", text: res.message ?? "Salvo." } : { tone: "error", text: res.error });
          if (res.ok) router.refresh();
        });
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="kcal" className="label">
            Calorias (kcal/dia)
          </label>
          <input id="kcal" className="input" inputMode="numeric" placeholder="Sem meta" value={kcal} onChange={(e) => setKcal(e.target.value)} />
        </div>
        <div>
          <label htmlFor="fat" className="label">
            Gorduras (g/dia)
          </label>
          <input id="fat" className="input" inputMode="decimal" placeholder="Sem meta" value={fat} onChange={(e) => setFat(e.target.value)} />
        </div>
      </div>
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      <Button type="submit" variant="secondary" loading={pending} className="w-full">
        Salvar metas opcionais
      </Button>
    </form>
  );
}
