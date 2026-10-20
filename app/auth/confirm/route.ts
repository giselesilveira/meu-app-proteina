import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Link mágico (alternativa ao código). O template de e-mail do Supabase aponta para
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
 */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const code = request.nextUrl.searchParams.get("code");
  const type = (request.nextUrl.searchParams.get("type") ?? "email") as EmailOtpType;
  const url = request.nextUrl.clone();
  url.search = "";

  const supabase = await createClient();
  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  } else if (code) {
    // Template padrão do Supabase ({{ .ConfirmationURL }}) com fluxo PKCE
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }
  url.pathname = "/entrar";
  url.searchParams.set("erro", "link");
  return NextResponse.redirect(url);
}
