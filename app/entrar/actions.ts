"use server";

import { z } from "zod";
import { track } from "@/lib/analytics";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidEmail, normalizeEmail, parseEmailList } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

/**
 * Login sem senha: envia código apenas para compras com acesso ativo ou admins.
 * Consulta de compras acontece exclusivamente no servidor.
 */
export async function requestLoginCode(emailInput: string): Promise<ActionResult> {
  const email = normalizeEmail(emailInput ?? "");
  if (!isValidEmail(email)) return { ok: false, error: "Digite um e-mail válido." };
  // Compras da Hotmart são registradas antes do primeiro login.
  // Não exigir usuário de autenticação existente para a primeira entrada.
  try {
    const isAdmin = parseEmailList(process.env.ADMIN_EMAILS).includes(email);
    if (!isAdmin) {
      const { data, error: accessError } = await createAdminClient()
        .from("entitlements")
        .select("id")
        .eq("email", email)
        .eq("status", "active")
        .or(`access_expires_at.is.null,access_expires_at.gt.${new Date().toISOString()}`)
        .limit(1);
      if (accessError) throw accessError;
      if (!data?.length) {
        return { ok: false, error: "Não encontramos uma compra ativa vinculada a este e-mail. Confira o endereço usado na compra ou entre em contato com o suporte." };
      }
    }
  } catch (error) {
    console.error("[login] consulta de acesso", error instanceof Error ? error.message : error);
    return { ok: false, error: "Não conseguimos verificar seu acesso agora. Tente novamente em instantes." };
  }
  const supabase = await createClient();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: appUrl ? `${appUrl}/auth/confirm` : undefined },
  });
  if (error) {
    console.error("[login] signInWithOtp", error.status, error.message);
    if (error.status === 429) {
      return { ok: false, error: "Muitas tentativas em pouco tempo. Aguarde um minuto e tente novamente." };
    }
    return { ok: false, error: "Não conseguimos enviar o código agora. Tente novamente em instantes." };
  }
  return { ok: true };
}

const codeSchema = z.string().regex(/^\d{6,10}$/);

export async function verifyLoginCode(emailInput: string, codeInput: string): Promise<ActionResult> {
  const email = normalizeEmail(emailInput ?? "");
  const code = (codeInput ?? "").replace(/\D/g, "");
  if (!isValidEmail(email) || !codeSchema.safeParse(code).success) {
    return { ok: false, error: "Confira o código recebido no e-mail." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) {
    console.warn("[login] verifyOtp", error.status, error.message);
    return { ok: false, error: "Código inválido ou expirado. Confira o e-mail ou peça um novo código." };
  }
  const { data: hasAccess } = await supabase.rpc("claim_my_entitlements");
  if (hasAccess) await track(supabase, "app_login");
  return { ok: true };
}
