import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { safeTimezone } from "./dates";
import { serverEnv } from "./env";
import { isAdminUser } from "./admin";
import { maskEmail, normalizeEmail } from "./email";
import { toNumbers } from "./numbers";
import { createClient } from "./supabase/server";
import type { NutritionProfile, Profile } from "./types";

/**
 * Mecanismo CENTRAL de proteção de rotas privadas:
 *  1. sessão válida (Supabase Auth, validada no servidor com getUser);
 *  2. entitlement ativo (função claim_my_entitlements no banco).
 * O banco reforça a mesma regra com RLS — esconder telas nunca é a única barreira.
 */
export type AccessState =
  | { kind: "anonymous" }
  | { kind: "no_access"; user: User; reason: "none" | "revoked" | "expired" }
  | { kind: "error" }
  | {
      kind: "ok";
      user: User;
      profile: Profile;
      nutrition: NutritionProfile | null;
      timezone: string;
    };

export const getAccess = cache(async (): Promise<AccessState> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: "anonymous" };

  const { data: hasAccess, error } = await supabase.rpc("claim_my_entitlements");
  if (error) {
    console.error("[access] claim_my_entitlements", error.message);
    return { kind: "error" };
  }
  if (!hasAccess) {
    const { data: ents } = await supabase.from("entitlements").select("status, access_expires_at");
    let reason: "none" | "revoked" | "expired" = "none";
    if (ents && ents.length > 0) {
      const expired = ents.some(
        (e) => e.status === "expired" || (e.access_expires_at && new Date(e.access_expires_at) <= new Date()),
      );
      reason = expired ? "expired" : "revoked";
    }
    return { kind: "no_access", user, reason };
  }

  const [{ data: profile }, { data: nutrition }] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, email, full_name, timezone, onboarding_completed_at")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("nutrition_profiles")
      .select("user_id, weight_kg, protein_factor, protein_target_g, calorie_target, fat_target_g")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (!profile) return { kind: "error" };

  return {
    kind: "ok",
    user,
    profile: profile as Profile,
    nutrition: nutrition
      ? toNumbers(nutrition as NutritionProfile, ["weight_kg", "protein_factor", "protein_target_g", "calorie_target", "fat_target_g"])
      : null,
    timezone: safeTimezone((profile as Profile).timezone),
  };
});

export type AppAccess = Extract<AccessState, { kind: "ok" }>;

/** Para páginas: redireciona quando não há sessão/acesso. */
export async function requireAccess(opts: { allowIncompleteOnboarding?: boolean } = {}): Promise<AppAccess> {
  const access = await getAccess();
  if (access.kind === "anonymous") redirect("/entrar");
  if (access.kind === "no_access") redirect(isAdminUser(access.user, process.env.ADMIN_EMAILS) ? "/admin" : "/sem-acesso");
  if (access.kind === "error") redirect("/erro");
  if (!opts.allowIncompleteOnboarding && (!access.profile.onboarding_completed_at || !access.nutrition)) {
    redirect("/boas-vindas");
  }
  return access;
}

/** Para Server Actions: não redireciona, devolve null. */
export async function accessForAction(): Promise<AppAccess | null> {
  const access = await getAccess();
  return access.kind === "ok" ? access : null;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return serverEnv.adminEmails().includes(normalizeEmail(email));
}

/**
 * Área admin: exige sessão válida e e-mail confirmado listado em ADMIN_EMAILS,
 * verificado no servidor. NÃO depende de compra: o admin acessa o painel sem
 * entitlement, mas também não ganha acesso às telas/dados de aluna (essas
 * continuam exigindo entitlement e RLS). Quem não é admin recebe 404.
 */
export const requireAdmin = cache(async (): Promise<{ user: User; email: string }> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  if (!isAdminUser(user, process.env.ADMIN_EMAILS)) {
    console.warn(`[admin] acesso negado para ${maskEmail(user.email)}`);
    notFound();
  }
  return { user, email: normalizeEmail(user.email!) };
});

export const SESSION_EXPIRED = "Sua sessão expirou. Entre novamente para continuar.";
export const ACCESS_INACTIVE = "Seu acesso ao app não está ativo no momento. Se precisar de ajuda, fale com o suporte.";
const TEMPORARY_ERROR = "Não conseguimos salvar agora. Tente novamente em instantes.";

/** Mensagem para Server Actions recusadas: diferencia sessão expirada de acesso revogado/expirado. */
export async function actionDeniedMessage(): Promise<string> {
  const access = await getAccess();
  if (access.kind === "no_access") return ACCESS_INACTIVE;
  if (access.kind === "error") return TEMPORARY_ERROR;
  return SESSION_EXPIRED;
}
