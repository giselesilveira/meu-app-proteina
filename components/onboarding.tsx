"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { completeOnboarding } from "@/app/(app)/actions";
import { format, isProteinFactor, parseDecimal, proteinTarget } from "@/lib/nutrition";
import { Wordmark } from "./brand";
import { FactorPicker } from "./factor-picker";
import { IconChevronLeft } from "./icons";
import { Button, Notice } from "./ui";

const TOTAL = 5;

export function Onboarding({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(initialName);
  const [weight, setWeight] = useState("");
  const [factor, setFactor] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const w = parseDecimal(weight);
  const weightOk = w !== null && w >= 25 && w <= 350;
  const target = weightOk && factor && isProteinFactor(factor) ? proteinTarget(w!, factor) : null;

  function next() {
    setError(null);
    if (step === 2 && !name.trim()) return setError("Informe seu nome.");
    if (step === 3 && !weightOk) return setError("Confira o peso informado (em kg, por exemplo 72,5).");
    if (step === 4 && !factor) return setError("Escolha a meta indicada pela Nutri Gisele.");
    setStep((s) => Math.min(TOTAL, s + 1));
  }

  function finish() {
    if (!target || !w || !factor) return;
    start(async () => {
      const res = await completeOnboarding({ fullName: name, weightKg: w, factor: factor as 1.5 | 1.8 | 2 });
      if (!res.ok) return setError(res.error);
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <main className="flex min-h-screen flex-col bg-cream px-5 pb-10 pt-8 sm:items-center sm:justify-center">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Wordmark />
          <p className="tabular text-sm font-semibold text-taupe" aria-live="polite">
            Passo {step} de {TOTAL}
          </p>
        </div>
        <div className="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-sand" aria-hidden="true">
          <div className="h-full bg-copper transition-all" style={{ width: `${(step / TOTAL) * 100}%` }} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step < TOTAL) next();
            else finish();
          }}
          noValidate
        >
          {step === 1 ? (
            <section>
              <h1 className="font-serif text-[2.4rem] font-semibold leading-tight">Bem-vinda ao App Maratona 21.</h1>
              <p className="mt-4 text-[1.1rem] text-cocoa">
                Aqui você acompanha a sua proteína do dia, registra o que comeu e vê a sua evolução durante a Maratona. Tudo fica salvo
                para você.
              </p>
              <p className="mt-3 text-mute">São só 3 informações rápidas.</p>
            </section>
          ) : null}

          {step === 2 ? (
            <section>
              <h1 className="font-serif text-[2rem] font-semibold">Como você gostaria de ser chamada?</h1>
              <label htmlFor="ob-name" className="label mt-6">
                Seu nome
              </label>
              <input id="ob-name" className="input" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </section>
          ) : null}

          {step === 3 ? (
            <section>
              <h1 className="font-serif text-[2rem] font-semibold">Qual é o seu peso atual?</h1>
              <label htmlFor="ob-weight" className="label mt-6">
                Peso (kg)
              </label>
              <input
                id="ob-weight"
                className="input text-[1.4rem] font-bold"
                inputMode="decimal"
                placeholder="Ex.: 72,5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                autoFocus
              />
            </section>
          ) : null}

          {step === 4 ? (
            <section>
              <h1 className="font-serif text-[2rem] font-semibold">Sua meta de proteína</h1>
              <p className="mb-6 mt-2 text-cocoa">Escolha a meta indicada pela Nutri Gisele.</p>
              <FactorPicker value={factor} onChange={setFactor} />
            </section>
          ) : null}

          {step === 5 && target ? (
            <section>
              <h1 className="font-serif text-[2rem] font-semibold">Tudo pronto, {name.trim().split(/\s+/)[0]}.</h1>
              <div className="mt-6 rounded-2xl bg-espresso p-6 text-cream">
                <p className="text-[1.1rem]">Com os dados informados, sua meta diária de proteína será de</p>
                <p className="tabular mt-2 text-[3rem] font-bold leading-none text-gold">{format.protein(target)}</p>
                <p className="mt-3 text-sm text-sand/75">
                  {format.number1(w!)} kg × {format.factor(factor!)}
                </p>
              </div>
            </section>
          ) : null}

          {error ? (
            <div className="mt-5">
              <Notice tone="error">{error}</Notice>
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3">
            <Button type="submit" loading={pending} className="w-full text-[1.1rem]">
              {step === 1 ? "Começar" : step === TOTAL ? "Entrar no painel" : "Continuar"}
            </Button>
            {step > 1 ? (
              <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={pending}>
                <IconChevronLeft size={20} /> Voltar
              </Button>
            ) : null}
          </div>
        </form>
      </div>
    </main>
  );
}
