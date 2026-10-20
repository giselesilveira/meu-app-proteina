import { FoodLogger } from "@/components/food-logger";
import { PageHeader } from "@/components/ui";
import { requireAccess } from "@/lib/access";
import { FOOD_COLUMNS, getFavorites, getRecentFoods, normalizeFood } from "@/lib/data/queries";
import { addDays, formatLongDate, isISODate, localDateISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { FoodItem } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Registrar alimento" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const access = await requireAccess();
  const params = await searchParams;
  const today = localDateISO(new Date(), access.timezone);
  const date = params.date && isISODate(params.date) && params.date <= today && params.date >= addDays(today, -400) ? params.date : today;

  const db = await createClient();
  let favorites: FoodItem[] = [];
  let recents: FoodItem[] = [];
  let initialFood: FoodItem | null = null;
  let loadError = false;
  try {
    [favorites, recents] = await Promise.all([getFavorites(db), getRecentFoods(db)]);
    if (params.food && /^[0-9a-f-]{36}$/i.test(params.food)) {
      const { data } = await db.from("food_catalog").select(FOOD_COLUMNS).eq("id", params.food).maybeSingle();
      initialFood = data ? normalizeFood(data) : null;
    }
  } catch (e) {
    console.error("[registrar]", e instanceof Error ? e.message : e);
    loadError = true;
  }

  return (
    <>
      <PageHeader
        eyebrow={date === today ? "Hoje" : formatLongDate(date)}
        title="Registrar alimento"
        subtitle="Busque, escolha a quantidade e adicione ao dia."
      />
      <FoodLogger
        date={date}
        isToday={date === today}
        favorites={favorites}
        recents={recents}
        favoriteIds={favorites.map((f) => f.id)}
        initialFood={initialFood}
        loadError={loadError}
      />
    </>
  );
}
