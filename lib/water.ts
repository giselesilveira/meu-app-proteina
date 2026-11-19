/** Controle de água: meta diária = 35 ml por kg do peso atual. */

export const WATER_ML_PER_KG = 35;
export const WATER_MAX_ML = 5000;
export const WATER_QUICK = [
  { label: "Copo", ml: 200 },
  { label: "Garrafa", ml: 500 },
] as const;

export function waterGoalMl(weightKg: number): number {
  return Math.round(weightKg * WATER_ML_PER_KG);
}

/**
 * Peso atual em uma data: o registro mais recente até essa data entre
 * o peso da meta (perfil/histórico de metas) e o peso da Evolução (check-ins).
 * Em caso de empate na data, vale o da Evolução. Sem nenhum registro, usa o
 * peso do perfil.
 */
export function weightOnDate(
  date: string,
  profileWeightKg: number,
  targets: { effective_date: string; weight_kg?: number | null }[],
  checkins: { checkin_date: string; weight_kg: number | null }[],
): number {
  let best: { date: string; kg: number; checkin: boolean } | null = null;
  for (const t of targets) {
    if (t.weight_kg == null || t.effective_date > date) continue;
    if (!best || t.effective_date > best.date) best = { date: t.effective_date, kg: Number(t.weight_kg), checkin: false };
  }
  for (const c of checkins) {
    if (c.weight_kg == null || c.checkin_date > date) continue;
    if (!best || c.checkin_date > best.date || (c.checkin_date === best.date && !best.checkin)) {
      best = { date: c.checkin_date, kg: Number(c.weight_kg), checkin: true };
    }
  }
  return best ? best.kg : profileWeightKg;
}

export function waterProgress(goalMl: number, consumedMl: number) {
  const remaining = Math.max(0, goalMl - consumedMl);
  const percent = goalMl > 0 ? Math.min(100, Math.round((consumedMl / goalMl) * 100)) : 0;
  return { goal: goalMl, consumed: consumedMl, remaining, percent, reached: goalMl > 0 && consumedMl >= goalMl };
}

const liters = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** 750 → "750 ml"; 2400 → "2,4 L"; 2398 → "2,4 L". */
export function formatWater(ml: number): string {
  if (Math.abs(ml) < 1000) return `${Math.round(ml)} ml`;
  return `${liters.format(Math.round(ml / 10) / 100)} L`;
}

/** Valida a quantidade digitada em ml (aceita vírgula). Retorna null se inválida. */
export function parseWaterMl(text: string): number | null {
  const t = text.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Math.round(Number(t));
  return n >= 1 && n <= WATER_MAX_ML ? n : null;
}

/** Monta os itens do quadro (horário no fuso da aluna). */
export function toWaterItems(entries: { id: string; amount_ml: number; created_at: string }[], timeZone: string) {
  const f = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone });
  return entries.map((e) => ({ id: e.id, amountMl: e.amount_ml, time: f.format(new Date(e.created_at)) }));
}
