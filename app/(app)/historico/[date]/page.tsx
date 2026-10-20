import Link from "next/link";
import { notFound } from "next/navigation";
import { EntryList } from "@/components/entry-list";
import { IconChevronLeft, IconChevronRight, IconPlus } from "@/components/icons";
import { ButtonLink, Card, Notice, PageHeader, Stat } from "@/components/ui";
import { requireAccess } from "@/lib/access";
import { getCheckins, getEntriesForDay, getTargetHistory, targetForDate } from "@/lib/data/queries";
import { addDays, formatLongDate, isISODate, localDateISO } from "@/lib/dates";
import { format, progress, sumEntries } from "@/lib/nutrition";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const access = await requireAccess();
  const { date } = await params;
  const today = localDateISO(new Date(), access.timezone);
  if (!isISODate(date) || date > today) notFound();
  const db = await createClient();

  try {
    const [entries, history, checkins] = await Promise.all([getEntriesForDay(db, date), getTargetHistory(db), getCheckins(db)]);
    const target = targetForDate(history, date);
    const totals = sumEntries(entries);
    const p = progress(target?.protein_target_g ?? access.nutrition!.protein_target_g, totals.protein);
    const checkin = checkins.find((c) => c.checkin_date === date);

    return (
      <>
        <nav className="mb-2 flex items-center justify-between" aria-label="Navegar entre dias">
          <Link href={`/historico/${addDays(date, -1)}`} className="inline-flex min-h-[48px] items-center gap-1 font-semibold text-cocoa">
            <IconChevronLeft size={20} /> Dia anterior
          </Link>
          {date < today ? (
            <Link href={`/historico/${addDays(date, 1)}`} className="inline-flex min-h-[48px] items-center gap-1 font-semibold text-cocoa">
              Próximo dia <IconChevronRight size={20} />
            </Link>
          ) : null}
        </nav>
        <PageHeader eyebrow={date === today ? "Hoje" : "Histórico"} title={formatLongDate(date)} />

        <Card className="mb-6 grid grid-cols-2 gap-5 p-5 sm:grid-cols-4">
          <Stat label="Meta" value={format.protein(p.target)} />
          <Stat label="Proteína" value={format.protein(p.consumed)} hint={p.reached ? "Meta atingida ✓" : undefined} />
          <Stat label="Calorias" value={format.calories(totals.calories)} />
          <Stat label="Gorduras" value={format.fat(totals.fat ?? 0)} />
        </Card>

        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Alimentos registrados</h2>
          </div>
          <EntryList entries={entries} />
          <ButtonLink href={`/registrar?date=${date}`} variant="secondary" className="mt-4 w-full">
            <IconPlus size={20} /> Registrar alimento neste dia
          </ButtonLink>
        </section>

        {checkin ? (
          <Card className="p-5">
            <h2 className="mb-3 text-lg font-bold">Check-in corporal</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {checkin.weight_kg !== null ? <Stat label="Peso" value={`${format.number1(checkin.weight_kg)} kg`} /> : null}
              {checkin.waist_cm !== null ? <Stat label="Cintura" value={`${format.number1(checkin.waist_cm)} cm`} /> : null}
              {checkin.abdomen_cm !== null ? <Stat label="Abdômen" value={`${format.number1(checkin.abdomen_cm)} cm`} /> : null}
              {checkin.hip_cm !== null ? <Stat label="Quadril" value={`${format.number1(checkin.hip_cm)} cm`} /> : null}
            </div>
          </Card>
        ) : null}
      </>
    );
  } catch (e) {
    console.error("[dia]", e instanceof Error ? e.message : e);
    return <Notice tone="error">Não conseguimos carregar seus dados agora. Tente novamente em instantes.</Notice>;
  }
}
