import { CheckinForm, CheckinList } from "@/components/checkin";
import { LineChart } from "@/components/line-chart";
import { Card, EmptyState, Notice, PageHeader } from "@/components/ui";
import { requireAccess } from "@/lib/access";
import { getCheckins } from "@/lib/data/queries";
import { isCheckinDay, localDateISO } from "@/lib/dates";
import { format } from "@/lib/nutrition";
import { createClient } from "@/lib/supabase/server";
import type { BodyCheckin } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Minha evolução" };

const METRICS: { key: keyof Pick<BodyCheckin, "weight_kg" | "waist_cm" | "abdomen_cm" | "hip_cm">; label: string; unit: string }[] = [
  { key: "weight_kg", label: "Peso", unit: "kg" },
  { key: "waist_cm", label: "Cintura", unit: "cm" },
  { key: "abdomen_cm", label: "Abdômen", unit: "cm" },
  { key: "hip_cm", label: "Quadril", unit: "cm" },
];

export default async function EvolutionPage() {
  const access = await requireAccess();
  const today = localDateISO(new Date(), access.timezone);
  const db = await createClient();
  let checkins: BodyCheckin[] = [];
  let failed = false;
  try {
    checkins = await getCheckins(db);
  } catch (e) {
    console.error("[evolucao]", e instanceof Error ? e.message : e);
    failed = true;
  }
  const todays = checkins.find((c) => c.checkin_date === today) ?? null;

  return (
    <>
      <PageHeader title="Minha evolução" subtitle="Registre peso e medidas. Todas as medidas são opcionais." />
      {failed ? <Notice tone="error">Não conseguimos carregar seus dados agora. Tente novamente em instantes.</Notice> : null}

      {isCheckinDay(today) ? (
        <div className="mb-4">
          <Notice>
            {todays ? "Check-in de hoje registrado. Você pode ajustar se quiser." : "Hoje é dia de registrar sua evolução."}
          </Notice>
        </div>
      ) : (
        <p className="mb-4 text-mute">Dias sugeridos para o check-in durante a Maratona: segunda e sexta.</p>
      )}

      <CheckinForm today={today} existing={todays} />

      <section className="mt-8 space-y-4" aria-labelledby="graficos">
        <h2 id="graficos" className="text-lg font-bold">
          Seus registros
        </h2>
        {checkins.length === 0 && !failed ? (
          <EmptyState title="Ainda sem registros">Seu primeiro check-in vira o ponto de partida dos gráficos.</EmptyState>
        ) : null}
        {METRICS.map((m) => {
          const points = checkins
            .filter((c) => c[m.key] !== null)
            .map((c) => ({ date: c.checkin_date, value: c[m.key] as number }));
          if (points.length === 0) return null;
          const first = points[0];
          const last = points[points.length - 1];
          const diff = last.value - first.value;
          return (
            <Card key={m.key} className="p-5">
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="text-lg font-bold">{m.label}</h3>
                <p className="tabular text-sm text-mute">
                  {points.length} {points.length === 1 ? "registro" : "registros"}
                </p>
              </div>
              <dl className="tabular mb-3 grid grid-cols-3 gap-2 min-[400px]:gap-3">
                <div>
                  <dt className="text-[0.8125rem] font-semibold text-taupe min-[400px]:uppercase min-[400px]:tracking-[0.08em]">Primeiro</dt>
                  <dd className="whitespace-nowrap text-[clamp(0.95rem,4.4vw,1.125rem)] font-bold">
                    {format.number1(first.value)} {m.unit}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.8125rem] font-semibold text-taupe min-[400px]:uppercase min-[400px]:tracking-[0.08em]">Atual</dt>
                  <dd className="whitespace-nowrap text-[clamp(0.95rem,4.4vw,1.125rem)] font-bold">
                    {format.number1(last.value)} {m.unit}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.8125rem] font-semibold text-taupe min-[400px]:uppercase min-[400px]:tracking-[0.08em]">Diferença</dt>
                  <dd className="whitespace-nowrap text-[clamp(0.95rem,4.4vw,1.125rem)] font-bold">
                    {diff > 0 ? "+" : diff < 0 ? "−" : ""}
                    {format.number1(Math.abs(diff))} {m.unit}
                  </dd>
                </div>
              </dl>
              <LineChart points={points} unit={m.unit} label={m.label} />
            </Card>
          );
        })}
      </section>

      {checkins.length > 0 ? <CheckinList checkins={[...checkins].reverse()} /> : null}
    </>
  );
}
