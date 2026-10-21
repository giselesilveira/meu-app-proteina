import { normalizeEmail, parseEmailList } from "./email";

/** Regra pura (testável) de quem é administrador: e-mail confirmado e listado em ADMIN_EMAILS. */
export function isAdminUser(
  user: { email?: string | null; email_confirmed_at?: string | null } | null | undefined,
  adminEmailsEnv: string | undefined,
): boolean {
  if (!user?.email || !user.email_confirmed_at) return false;
  return parseEmailList(adminEmailsEnv).includes(normalizeEmail(user.email));
}
