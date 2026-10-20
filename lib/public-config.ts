/** Configurações públicas (podem ir para o navegador). */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

export const publicConfig = {
  appUrl: (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, ""),
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? process.env.SUPPORT_EMAIL ?? "",
  supportUrl: process.env.NEXT_PUBLIC_SUPPORT_URL ?? process.env.SUPPORT_URL ?? "",
  privacyPolicyUrl: process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL ?? process.env.PRIVACY_POLICY_URL ?? "",
  termsUrl: process.env.NEXT_PUBLIC_TERMS_URL ?? process.env.TERMS_URL ?? "",
};

/** Caminho com o basePath, para fetch() e links fora do <Link> do Next. */
export function withBasePath(path: string): string {
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}

export function supportHref(): string | null {
  if (publicConfig.supportUrl) return publicConfig.supportUrl;
  if (publicConfig.supportEmail) {
    return `mailto:${publicConfig.supportEmail}?subject=${encodeURIComponent("Acesso ao App Maratona 21")}`;
  }
  return null;
}
