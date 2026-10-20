"use client";

import { format, PROTEIN_FACTORS } from "@/lib/nutrition";

/** Seleção do fator g/kg. O app NÃO recomenda nenhum: a escolha é da orientação da Nutri. */
export function FactorPicker({ value, onChange, name = "factor" }: { value: number | null; onChange: (v: number) => void; name?: string }) {
  return (
    <fieldset>
      <legend className="label">Escolha a meta indicada pela Nutri Gisele</legend>
      <div className="grid grid-cols-3 gap-3">
        {PROTEIN_FACTORS.map((f) => {
          const checked = value === f;
          return (
            <label
              key={f}
              className={`flex min-h-[64px] cursor-pointer items-center justify-center rounded-xl border text-[1.15rem] font-bold transition-colors ${
                checked ? "border-ink bg-ink text-cream" : "border-sand bg-white text-ink hover:border-copper"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={f}
                checked={checked}
                onChange={() => onChange(f)}
                className="sr-only"
              />
              {format.factor(f)}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
