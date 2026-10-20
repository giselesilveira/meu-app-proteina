import Link from "next/link";
import { IconCheck, IconChevronLeft, IconChevronRight } from "@/components/icons";
import { EmptyState, Notice, PageHeader } from "@/components/ui";
import { requireAccess } from "@/lib/access";
import { getCheckins, getEntriesBetween, getTargetHistory, targetForDate } from "@/lib/data/queries";
import { addDays, formatDayMonth, localDateISO } from "@/lib/dates";
import { format, progress, sumEntries } from "@/lib/nutrition";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Seu histórico" };

const PAGE_DAYS = 28;

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ ate?: string }> }) {
  const access = await requireAccess();
  const today = localDateISO(new Date(), access.timezone);
  const { ate } = await searchParams;
  const to = ate && /^\d{4}-\d{2}-\d{2}$/.test(ate) && ate <= today ? ate : today;
  const from = addDays(to, -(PAGE_DAYS - 1));
  const db = await createClient();

  let days: { date: string; protein: number; calories: number; fat: number; count: number; target: number; checkin: boolean }[] = [];
  let failed = false;
  try {
    const [entries, history, checkins] = await Promise.all([getEntriesBetween(db, from, to), getTargetHistory(db), getCheckins(db)]);
    const checkinDates = new Set(checkins.map((c) => c.checkin_date));
    const dates = new Set<string>([...entries.map((e) => e.entry_date), ...[...checkinDates].filter((d) => d >= from && d <= to)]);
    days = [...dates]
      .sort((a, b) => (a < b ? 1 : -1))
      .map((date) => {
        const dayEntries = entries.filter((e) => e.entry_date === date);
        const t = sumEntries(dayEntries);
        return {
          date,
          protein: t.protein,
          calories: t.calories,
          fat: t.fat ?? 0,
          count: dayEntries.length,
          target: targetForDate(history, date)?.protein_target_g ?? access.nutrition!.protein_target_g,
          checkin: checkinDates.has(date),
        };
      });
  } catch (e) {
    console.error("[historico]", e instanceof Error ? e.message : e);
    failed = true;
  }

  return (
    <>
      <PageHeader title="Seu histórico" subtitle="Toque em um dia para ver, editar ou excluir registros." />
      {failed ? <Notice tone="error">Não conseguimos carregar seus dados agora. Tente novamente em instantes.</Notice> : null}

      {!failed && days.length === 0 ? (
        <EmptyState title="Nada registrado neste período">Os dias com registros aparecem aqui.</EmptyState>
      ) : null}

      <ul className="space-y-3">
        {days.map((d) => {
          const p = progress(d.target, d.protein);
          return (
            <li key={d.date}>
              <Link href={`/historico/${d.date}`} className="card flex items-center gap-4 p-4 hover:border-copper">
                <div className="w-20 shrink-0">
                  <p className="font-bold capitalize leading-tight">{formatDayMonth(d.date)}</p>
                  {d.date === today ? <p className="text-sm font-semibold text-copper">Hoje</p> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="tabular font-semibold">
                    {format.protein(p.consumed)} <span className="font-normal text-mute">de {format.protein(p.target)}</span>
                    {p.reached ? <IconCheck size={18} className="ml-1 inline text-copper" aria-label="meta atingida" /> : null}
                  </p>
                  <p className="tabular text-sm text-mute">
                    {format.calories(d.calories)} · {format.fat(d.fat)} gord. · {d.count} {d.count === 1 ? "alimento" : "alimentos"}
                    {d.checkin ? " · check-in" : ""}
                  </p>
                </div>
                <IconChevronRight className="shrink-0 text-taupe" />
              </Link>
            </li>
          );
        })}
      </ul>

      <nav aria-label="Períodos" className="mt-6 flex justify-between">
        <Link href={`/historico?ate=${addDays(from, -1)}`} className="inline-flex min-h-[48px] items-center gap-1 font-semibold text-cocoa">
          <IconChevronLeft size={20} /> Anteriores
        </Link>
        {to < today ? (
          <Link
            href={addDays(to, PAGE_DAYS) >= today ? "/historico" : `/historico?ate=${addDays(to, PAGE_DAYS)}`}
            className="inline-flex min-h-[48px] items-center gap-1 font-semibold text-cocoa"
          >
            Mais recentes <IconChevronRight size={20} />
          </Link>
        ) : null}
      </nav>
    </>
  );
}
