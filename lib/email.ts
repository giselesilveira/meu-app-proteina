export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(normalizeEmail(email)) && email.length <= 254;
}

export function parseEmailList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}
