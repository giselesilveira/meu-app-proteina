import "server-only";

/**
 * E-mail de boas-vindas via Resend (API HTTP, sem SDK).
 * Opcional: sem RESEND_API_KEY/EMAIL_FROM nada é enviado e a compra segue normalmente.
 */
export function welcomeEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.NEXT_PUBLIC_APP_URL);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function welcomeEmailContent(appUrl: string, name: string | null) {
  const greeting = name ? `Olá, ${escapeHtml(name)}!` : "Olá!";
  const subject = "Seu acesso ao App Maratona 21 está liberado";
  const text = `${name ? `Olá, ${name}!` : "Olá!"}\n\nSeu acesso ao App Maratona 21 já está disponível.\n\nUse o mesmo e-mail informado na sua compra para entrar.\n\nACESSAR O APP: ${appUrl}\n`;
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F6F0E6;font-family:Arial,Helvetica,sans-serif;color:#14100D">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:520px;background:#FBF8F2;border-radius:16px;padding:32px">
<tr><td style="font-size:13px;letter-spacing:2px;color:#B4642F;text-transform:uppercase">Maratona 21</td></tr>
<tr><td style="padding-top:12px;font-size:24px;font-family:Georgia,serif">${greeting}</td></tr>
<tr><td style="padding-top:16px;font-size:17px;line-height:1.6">Seu acesso ao App Maratona 21 já está disponível.</td></tr>
<tr><td style="padding-top:8px;font-size:17px;line-height:1.6">Use o mesmo e-mail informado na sua compra para entrar.</td></tr>
<tr><td style="padding-top:28px"><a href="${escapeHtml(appUrl)}" style="display:inline-block;background:#14100D;color:#F6F0E6;text-decoration:none;padding:16px 28px;border-radius:12px;font-weight:bold;font-size:16px;letter-spacing:1px">ACESSAR O APP</a></td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html };
}

export async function sendWelcomeEmail(to: string, name: string | null): Promise<void> {
  if (!welcomeEmailConfigured()) return;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const { subject, text, html } = welcomeEmailContent(appUrl, name);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text, html }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Resend respondeu ${res.status}`);
}
