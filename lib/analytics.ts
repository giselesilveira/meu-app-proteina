import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Analytics básico, interno (tabela analytics_events). Sem plataforma externa e
 * sem dados sensíveis: só o nome do evento e propriedades técnicas mínimas.
 */
export type AnalyticsEvent = "app_login" | "onboarding_completed" | "food_added" | "favorite_added" | "body_checkin_added";

export async function track(
  db: SupabaseClient,
  event: AnalyticsEvent,
  properties: Record<string, string | number | boolean> = {},
): Promise<void> {
  const { error } = await db.from("analytics_events").insert({ event_name: event, properties });
  if (error) console.warn("[analytics]", event, error.message);
}
