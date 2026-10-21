export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(normalizeEmail(email)) && email.length <= 254;
}

/** Lista separada por vírgula; tolera espaços, maiúsculas e aspas coladas por engano. */
export function parseEmailList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((v) => normalizeEmail(v.replace(/["'`]/g, "")))
    .filter(Boolean);
}

/** Para logs: "gisele@nutri…" -> "gi***@nutrigiselesilveira.com.br". */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "(sem e-mail)";
  const [user, domain] = normalizeEmail(email).split("@");
  return `${user.slice(0, 2)}***@${domain ?? ""}`;
}
