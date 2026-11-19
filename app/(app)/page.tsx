import Link from "next/link";
import Image from "next/image";
import logo from "@/public/MARATONA (1).png";
import { EntryList } from "@/components/entry-list";
import { IconCalendar, IconChart, IconPlus, IconStar } from "@/components/icons";
import { ProgressRing } from "@/components/progress-ring";
import { WaterCard, type WaterItem } from "@/components/water-card";
import { ButtonLink, Card, Notice } from "@/components/ui";
import { requireAccess } from "@/lib/access";
import { getCheckins, getEntriesForDay, getFavorites, getTargetHistory, getWaterBetween } from "@/lib/data/queries";
import { formatLongDate, isCheckinDay, localDateISO } from "@/lib/dates";
import { format, progress, sumEntries } from "@/lib/nutrition";
import { createClient } from "@/lib/supabase/server";
import { toWaterItems, waterGoalMl, weightOnDate } from "@/lib/water";

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
  let weightKg = nutrition.weight_kg;
  try {
    const [e, f, c, h] = await Promise.all([getEntriesForDay(db, today), getFavorites(db), getCheckins(db), getTargetHistory(db)]);
    entries = e;
    favorites = f.slice(0, 6);
    checkedInToday = c.some((x) => x.checkin_date === today);
    weightKg = weightOnDate(today, nutrition.weight_kg, h, c);
  } catch (error) {
    console.error("[today]", error instanceof Error ? error.message : error);
    loadError = true;
  }

  // Água: carregada à parte para que uma falha aqui não afete o restante da tela.
  let water: WaterItem[] | null = null;
  try {
    water = toWaterItems(await getWaterBetween(db, today, today), access.timezone);
  } catch (error) {
    console.error("[today:water]", error instanceof Error ? error.message : error);
  }

  const totals = sumEntries(entries);
  const p = progress(nutrition.protein_target_g, totals.protein);
  const name = firstName(access.profile.full_name);

  return (
    <div className="space-y-6">
      <div className="flex justify-center rounded-2xl bg-espresso px-4 py-3">
        <Image src={logo} alt="Maratona 21 Dias" priority sizes="(min-width: 640px) 180px, 140px" className="h-auto w-[140px] max-w-full object-contain sm:w-[180px]" />
      </div>
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
              <dt className="whitespace-nowrap text-[0.8125rem] font-semibold text-sand/75 min-[400px]:uppercase min-[400px]:tracking-[0.12em]">Meta</dt>
              <dd className="tabular mt-1 whitespace-nowrap text-[clamp(1.05rem,5.4vw,1.65rem)] font-bold leading-none">{format.protein(p.target)}</dd>
            </div>
            <div>
              <dt className="whitespace-nowrap text-[0.8125rem] font-semibold text-sand/75 min-[400px]:uppercase min-[400px]:tracking-[0.12em]">Consumido</dt>
              <dd className="tabular mt-1 whitespace-nowrap text-[clamp(1.05rem,5.4vw,1.65rem)] font-bold leading-none text-gold">{format.protein(p.consumed)}</dd>
            </div>
            <div>
              <dt className="whitespace-nowrap text-[0.8125rem] font-semibold text-sand/75 min-[400px]:uppercase min-[400px]:tracking-[0.12em]">Faltam</dt>
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

      {/* Água */}
      {water ? <WaterCard date={today} goalMl={waterGoalMl(weightKg)} weightKg={weightKg} items={water} /> : null}

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

      {/* 5. Check-in (segunda e sexta) */}
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

