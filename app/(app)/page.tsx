import Link from "next/link";
import { EntryList } from "@/components/entry-list";
import { IconCalendar, IconChart, IconPlus, IconStar } from "@/components/icons";
import { Bar, ProgressRing } from "@/components/progress-ring";
import { ButtonLink, Card, Notice } from "@/components/ui";
import { requireAccess } from "@/lib/access";
import { getCheckins, getEntriesForDay, getFavorites } from "@/lib/data/queries";
import { formatLongDate, isCheckinDay, localDateISO } from "@/lib/dates";
import { format, progress, sumEntries } from "@/lib/nutrition";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function firstName(full: string | null) {
  return full?.trim().split(/\s+/)[0] ?? "";
}

export default async function TodayPage() {
  const access = await requireAccess();
  const nutrition = access.nutrition!;
  const today = localDateISO(new Date(), access.timezone);
  const db = await createClient();

  let loadError = false;
  let entries: Awaited<ReturnType<typeof getEntriesForDay>> = [];
  let favorites: Awaited<ReturnType<typeof getFavorites>> = [];
  let checkedInToday = false;
  try {
    const [e, f, c] = await Promise.all([getEntriesForDay(db, today), getFavorites(db), getCheckins(db)]);
    entries = e;
    favorites = f.slice(0, 6);
    checkedInToday = c.some((x) => x.checkin_date === today);
  } catch (error) {
    console.error("[today]", error instanceof Error ? error.message : error);
    loadError = true;
  }

  const totals = sumEntries(entries);
  const p = progress(nutrition.protein_target_g, totals.protein);
  const name = firstName(access.profile.full_name);

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">{formatLongDate(today)}</p>
        <h1 className="mt-1 font-serif text-[2.3rem] font-semibold leading-tight">Olá{name ? `, ${name}` : ""}</h1>
      </header>

      {loadError ? (
        <Notice tone="error">Não conseguimos carregar seus dados agora. Tente novamente em instantes.</Notice>
      ) : null}

      {/* 1. Progresso da proteína */}
      <section aria-labelledby="meta-proteina" className="overflow-hidden rounded-[1.6rem] bg-espresso p-5 text-cream shadow-card min-[400px]:p-6 sm:p-8">
        <h2 id="meta-proteina" className="eyebrow text-gold">
          Meta de proteína
        </h2>
        <div className="mt-5 flex flex-col items-center gap-7 sm:flex-row sm:items-center sm:gap-9">
          <ProgressRing percent={p.percent} consumed={p.consumed} />
          <dl className="grid w-full grid-cols-3 gap-2 text-center min-[400px]:gap-3 sm:grid-cols-1 sm:gap-5 sm:text-left">
            <div>
              <dt className="whitespace-nowrap text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-sand/70 min-[400px]:text-[0.78rem] min-[400px]:tracking-[0.14em]">Meta</dt>
              <dd className="tabular mt-1 whitespace-nowrap text-[clamp(1.05rem,5.4vw,1.65rem)] font-bold leading-none">{format.protein(p.target)}</dd>
            </div>
            <div>
              <dt className="whitespace-nowrap text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-sand/70 min-[400px]:text-[0.78rem] min-[400px]:tracking-[0.14em]">Consumido</dt>
              <dd className="tabular mt-1 whitespace-nowrap text-[clamp(1.05rem,5.4vw,1.65rem)] font-bold leading-none text-gold">{format.protein(p.consumed)}</dd>
            </div>
            <div>
              <dt className="whitespace-nowrap text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-sand/70 min-[400px]:text-[0.78rem] min-[400px]:tracking-[0.14em]">Faltam</dt>
              <dd className="tabular mt-1 whitespace-nowrap text-[clamp(1.05rem,5.4vw,1.65rem)] font-bold leading-none">{format.protein(p.remaining)}</dd>
            </div>
          </dl>
        </div>
        {p.reached ? (
          <p className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-center font-semibold text-gold sm:justify-start">
            Meta de proteína atingida hoje ✓
          </p>
        ) : null}
      </section>

      {/* 2. Ação principal */}
      <ButtonLink href="/registrar" variant="copper" className="w-full text-[1.15rem]">
        <IconPlus size={24} /> Registrar alimento
      </ButtonLink>

      {/* 3. Favoritos */}
      {favorites.length > 0 ? (
        <section aria-labelledby="favoritos">
          <h2 id="favoritos" className="mb-3 flex items-center gap-2 text-lg font-bold">
            <IconStar size={20} className="text-copper" filled /> Favoritos
          </h2>
          <ul className="flex flex-wrap gap-2">
            {favorites.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/registrar?food=${f.id}`}
                  className="inline-flex min-h-[48px] items-center rounded-full border border-bark/15 bg-ivory px-4 text-[0.98rem] font-semibold text-cocoa hover:border-copper"
                >
                  {f.display_name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 4. Consumido hoje */}
      <section aria-labelledby="consumido-hoje">
        <h2 id="consumido-hoje" className="mb-3 text-lg font-bold">
          Consumido hoje
        </h2>
        <EntryList entries={entries} emptyHref="/registrar" />
      </section>

      {/* 5. Calorias e gorduras */}
      <Card className="p-5">
        <h2 className="mb-4 text-lg font-bold">Resumo do dia</h2>
        <div className="grid grid-cols-2 gap-5">
          <SecondaryMetric label="Calorias" value={format.calories(totals.calories)} consumed={totals.calories} target={nutrition.calorie_target} unit="kcal" />
          <SecondaryMetric label="Gorduras" value={format.fat(totals.fat ?? 0)} consumed={totals.fat ?? 0} target={nutrition.fat_target_g} unit="g" />
        </div>
      </Card>

      {/* 6. Check-in (segunda e sexta) */}
      {isCheckinDay(today) && !checkedInToday ? (
        <Card className="flex items-center justify-between gap-4 border-gold/40 bg-gold/10 p-5">
          <div>
            <p className="font-bold">Hoje é dia de registrar sua evolução.</p>
            <p className="text-mute">Peso e medidas levam menos de um minuto.</p>
          </div>
          <ButtonLink href="/evolucao" variant="primary" className="shrink-0 px-5">
            Registrar
          </ButtonLink>
        </Card>
      ) : null}

      {/* 7. Atalhos */}
      <nav aria-label="Atalhos" className="grid grid-cols-2 gap-3">
        <Link href="/historico" className="card flex min-h-[64px] items-center gap-3 px-4 font-semibold hover:border-copper">
          <IconCalendar className="text-copper" /> Seu histórico
        </Link>
        <Link href="/evolucao" className="card flex min-h-[64px] items-center gap-3 px-4 font-semibold hover:border-copper">
          <IconChart className="text-copper" /> Minha evolução
        </Link>
      </nav>
    </div>
  );
}

function SecondaryMetric({
  label,
  value,
  consumed,
  target,
  unit,
}: {
  label: string;
  value: string;
  consumed: number;
  target: number | null;
  unit: string;
}) {
  return (
    <div>
      <p className="text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-taupe">{label}</p>
      <p className="tabular mt-1 text-[1.4rem] font-bold">{value}</p>
      {target ? (
        <div className="mt-2 space-y-1">
          <Bar percent={Math.round((consumed / target) * 100)} label={`${label}: progresso da meta`} />
          <p className="tabular text-sm text-mute">
            Meta: {new Intl.NumberFormat("pt-BR").format(target)} {unit}
          </p>
        </div>
      ) : (
        <p className="text-sm text-mute">Consumido hoje</p>
      )}
    </div>
  );
}
