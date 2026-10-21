import { DEFAULT_TIMEZONE, localDateISO } from "./dates";

/**
 * Prazo de acesso das compras Hotmart.
 *
 * Regra: 6 meses de calendário contados da data de APROVAÇÃO da compra, no fuso de
 * São Paulo. O acesso vale até o FIM do dia de vencimento (inclusive).
 *   aprovada em 15/03/2026 14h30 -> acesso até 15/09/2026 (23h59)
 *   aprovada em 31/08/2026       -> acesso até 28/02/2027 (mês sem dia 31: último dia do mês)
 *   aprovada em 31/08/2027       -> acesso até 29/02/2028 (ano bissexto)
 *
 * O banco guarda `access_expires_at` como o instante EXCLUSIVO de término, isto é,
 * 00h00 (São Paulo) do dia seguinte ao vencimento. O acesso existe enquanto
 * `access_expires_at > agora`. A função SQL public.access_period_end() aplica a mesma regra.
 */
export const HOTMART_ACCESS_MONTHS = 6;

/** Diferença (minutos) entre o horário local do fuso e UTC no instante informado. */
function offsetMinutes(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / 60000);
}

/** Instante UTC correspondente a 00h00 de y-m-d no fuso informado. */
export function zonedMidnight(y: number, m: number, d: number, timeZone = DEFAULT_TIMEZONE): Date {
  const guess = Date.UTC(y, m - 1, d);
  let ts = guess - offsetMinutes(guess, timeZone) * 60000;
  ts = guess - offsetMinutes(ts, timeZone) * 60000; // ajuste se houver mudança de horário no meio
  return new Date(ts);
}

/** Soma meses de calendário a uma data ISO; se o dia não existir no mês final, usa o último dia. */
export function addCalendarMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = m - 1 + months;
  const ty = y + Math.floor(target / 12);
  const tm = ((target % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  return `${ty}-${String(tm + 1).padStart(2, "0")}-${String(Math.min(d, lastDay)).padStart(2, "0")}`;
}

/** Último dia de acesso (data ISO, inclusive) para uma aprovação. */
export function accessLastDay(approvedAt: Date, months = HOTMART_ACCESS_MONTHS, timeZone = DEFAULT_TIMEZONE): string {
  return addCalendarMonths(localDateISO(approvedAt, timeZone), months);
}

/** Instante exclusivo de término (00h00 do dia seguinte ao último dia) — valor de access_expires_at. */
export function endOfAccessDay(lastDayIso: string, timeZone = DEFAULT_TIMEZONE): Date {
  const [y, m, d] = lastDayIso.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return zonedMidnight(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), timeZone);
}

export function accessPeriodEnd(approvedAt: Date, months = HOTMART_ACCESS_MONTHS, timeZone = DEFAULT_TIMEZONE): Date {
  return endOfAccessDay(accessLastDay(approvedAt, months, timeZone), timeZone);
}

/** Último dia de acesso (data ISO) a partir do access_expires_at armazenado. */
export function lastAccessDayFromExpiry(expiresAt: Date | string, timeZone = DEFAULT_TIMEZONE): string {
  const t = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return localDateISO(new Date(t.getTime() - 1), timeZone);
}

export function formatAccessUntil(expiresAt: Date | string, timeZone = DEFAULT_TIMEZONE): string {
  const [y, m, d] = lastAccessDayFromExpiry(expiresAt, timeZone).split("-");
  return `${d}/${m}/${y}`;
}

export type AccessState = "active" | "expired" | "revoked";

/** Situação exibida no admin: revogado > expirado (data passou) > ativo. */
export function accessState(e: { status: string; access_expires_at: string | null }, now = new Date()): AccessState {
  if (e.status === "revoked") return "revoked";
  if (e.status === "expired") return "expired";
  if (e.access_expires_at && new Date(e.access_expires_at).getTime() <= now.getTime()) return "expired";
  return "active";
}
