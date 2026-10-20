import "server-only";
import { parseEmailList } from "./email";

/** Variáveis de ambiente do servidor. Nunca importe este arquivo em componentes client. */
function list(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export const serverEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  hotmartHottok: process.env.HOTMART_HOTTOK ?? "",
  hotmartAllowedProducts: () => list(process.env.HOTMART_ALLOWED_PRODUCT_UCODES),
  hotmartAllowedOffers: () => list(process.env.HOTMART_ALLOWED_OFFER_CODES),
  adminEmails: () => parseEmailList(process.env.ADMIN_EMAILS),
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "",
};
