/**
 * Datas no fuso da aluna (padrão America/Sao_Paulo).
 * A data de um registro (entry_date) é sempre calculada no fuso, nunca em UTC:
 * um registro às 23h50 de São Paulo continua no mesmo dia, mesmo que em UTC já
 * seja o dia seguinte.
 */
export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

export function safeTimezone(tz: string | null | undefined): string {
  if (!tz) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/** "AAAA-MM-DD" do instante informado no fuso. */
export function localDateISO(date: Date = new Date(), timeZone: string = DEFAULT_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimezone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Soma dias a uma data ISO (sem depender do fuso do servidor). */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = domingo … 6 = sábado, para a data ISO. */
export function weekdayOf(iso: string): number {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

/** Segunda e sexta são os dias sugeridos para o check-in corporal. */
export function isCheckinDay(iso: string): boolean {
  const w = weekdayOf(iso);
  return w === 1 || w === 5;
}

export function formatLongDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  const text = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(d);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(d);
}

export function formatDayMonth(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  const text = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .format(d)
    .replace(/\./g, "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
