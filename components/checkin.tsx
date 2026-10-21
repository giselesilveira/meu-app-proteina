"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteCheckin, saveCheckin, updateProteinTarget } from "@/app/(app)/actions";
import { formatDayMonth } from "@/lib/dates";
import { format, parseDecimal } from "@/lib/nutrition";
import type { BodyCheckin } from "@/lib/types";
import { IconTrash } from "./icons";
import { Button, Card, Notice } from "./ui";

const FIELDS = [
  { key: "weight", label: "Peso", unit: "kg", placeholder: "Ex.: 72,5" },
  { key: "waist", label: "Cintura", unit: "cm", placeholder: "Opcional" },
  { key: "abdomen", label: "Abdômen", unit: "cm", placeholder: "Opcional" },
  { key: "hip", label: "Quadril", unit: "cm", placeholder: "Opcional" },
] as const;

type Key = (typeof FIELDS)[number]["key"];

function toText(v: number | null | undefined) {
  return v === null || v === undefined ? "" : String(v).replace(".", ",");
}

export function CheckinForm({ today, existing }: { today: string; existing: BodyCheckin | null }) {
  const router = useRouter();
  const [date, setDate] = useState(today);
  const [values, setValues] = useState<Record<Key, string>>({
    weight: toText(existing?.weight_kg),
    waist: toText(existing?.waist_cm),
    abdomen: toText(existing?.abdomen_cm),
    hip: toText(existing?.hip_cm),
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [ask, setAsk] = useState<{ weightKg: number; newTarget: number; key: number } | null>(null);
  const [pending, startTransition] = useTransition();

  function parse(key: Key): number | null | "invalid" {
    const raw = values[key].trim();
    if (!raw) return null;
    const n = parseDecimal(raw);
    return n === null ? "invalid" : n;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setAsk(null);
    const parsed = Object.fromEntries(FIELDS.map((f) => [f.key, parse(f.key)])) as Record<Key, number | null | "invalid">;
    if (Object.values(parsed).includes("invalid")) return setError("Use apenas números, por exemplo 72,5.");
    startTransition(async () => {
      const res = await saveCheckin({
        date,
        weightKg: parsed.weight as number | null,
        waistCm: parsed.waist as number | null,
        abdomenCm: parsed.abdomen as number | null,
        hipCm: parsed.hip as number | null,
      });
      if (!res.ok) return setError(res.error);
      setSuccess(res.message ?? "Evolução registrada.");
      if (res.data?.askRecalculate && res.data.weightKg && res.data.newTarget) {
        setAsk({ weightKg: res.data.weightKg, newTarget: res.data.newTarget, key: Date.now() });
      }
      router.refresh();
    });
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} noValidate>
        <h2 className="mb-4 text-lg font-bold">Novo check-in</h2>
        <label htmlFor="checkin-date" className="label">
          Data
        </label>
        <input id="checkin-date" type="date" className="input" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
        <div className="mt-4 grid grid-cols-2 gap-4">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label htmlFor={`checkin-${f.key}`} className="label">
                {f.label} ({f.unit})
              </label>
              <input
                id={`checkin-${f.key}`}
                className="input"
                inputMode="decimal"
                placeholder={f.placeholder}
                value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        {error ? (
          <div className="mt-4">
            <Notice tone="error">{error}</Notice>
          </div>
        ) : null}
        {success && !ask ? (
          <div className="mt-4">
            <Notice tone="success">{success}</Notice>
          </div>
        ) : null}
        <Button type="submit" loading={pending} className="mt-5 w-full">
          Salvar evolução
        </Button>
      </form>
      {ask ? <RecalculateDialog key={ask.key} weightKg={ask.weightKg} newTarget={ask.newTarget} onClose={() => setAsk(null)} /> : null}
    </Card>
  );
}

/** Peso novo: pergunta antes de mudar a meta (nunca muda sozinho). */
function RecalculateDialog({ weightKg, newTarget, onClose }: { weightKg: number; newTarget: number; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function recalc() {
    startTransition(async () => {
      // mantém o mesmo fator: o servidor recalcula com o fator salvo
      const res = await updateProteinTargetKeepingFactor(weightKg);
      if (!res.ok) return setError(res.error);
      setDone(true);
      router.refresh();
    });
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="recalc-title" className="mt-5 rounded-xl border border-gold/50 bg-gold/10 p-4">
      {done ? (
        <>
          <p id="recalc-title" className="font-semibold">
            Sua nova meta diária de proteína é {format.protein(newTarget)}.
          </p>
          <Button variant="secondary" onClick={onClose} className="mt-3 w-full">
            Fechar
          </Button>
        </>
      ) : (
        <>
          <p id="recalc-title" className="font-semibold">
            Seu peso foi atualizado. Deseja recalcular sua meta de proteína usando o mesmo fator?
          </p>
          <p className="mt-1 text-mute">Com {format.number1(weightKg)} kg, a meta passaria a ser {format.protein(newTarget)}.</p>
          {error ? (
            <div className="mt-3">
              <Notice tone="error">{error}</Notice>
            </div>
          ) : null}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button onClick={recalc} loading={pending} className="flex-1">
              Recalcular
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={pending} className="flex-1">
              Manter meta atual
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

async function updateProteinTargetKeepingFactor(weightKg: number) {
  return updateProteinTarget({ weightKg, factor: null });
}

export function CheckinList({ checkins }: { checkins: BodyCheckin[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<string | null>(null);

  return (
    <section className="mt-8" aria-labelledby="lista-checkins">
      <h2 id="lista-checkins" className="mb-3 text-lg font-bold">
        Todos os check-ins
      </h2>
      <ul className="card divide-y divide-sand/80">
        {checkins.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="font-semibold">{formatDayMonth(c.checkin_date)}</p>
              <p className="tabular text-sm text-mute">
                {[
                  c.weight_kg !== null ? `${format.number1(c.weight_kg)} kg` : null,
                  c.waist_cm !== null ? `cintura ${format.number1(c.waist_cm)}` : null,
                  c.abdomen_cm !== null ? `abdômen ${format.number1(c.abdomen_cm)}` : null,
                  c.hip_cm !== null ? `quadril ${format.number1(c.hip_cm)}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            {confirm === c.id ? (
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  className="min-h-[44px] px-3"
                  loading={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await deleteCheckin(c.id);
                      setConfirm(null);
                      router.refresh();
                    })
                  }
                >
                  Excluir
                </Button>
                <Button variant="ghost" className="min-h-[44px] px-3" onClick={() => setConfirm(null)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirm(c.id)}
                aria-label={`Excluir check-in de ${formatDayMonth(c.checkin_date)}`}
                className="flex h-11 min-w-[44px] shrink-0 items-center justify-center rounded-lg text-taupe hover:bg-sand/60 hover:text-danger"
              >
                <IconTrash size={20} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
