import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "./brand";

/**
 * Enquanto os textos não forem revisados por advogada(o), as páginas mostram um aviso
 * discreto de versão preliminar. Depois da revisão jurídica, mude para false.
 * Pontos a revisar: LEGAL_REVIEW.md.
 */
export const LEGAL_REVIEW_PENDING = true;

export const LEGAL_UPDATED_AT = "21 de outubro de 2026";

export const RESPONSIBLE = {
  company: "Gisele da Silva Silveira Ltda",
  cnpj: "10.255.896/0001-03",
  brand: "Nutri Gisele Silveira",
  email: "gisele@nutrigiselesilveira.com.br",
};

export function LegalPage({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-sand bg-ivory">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-5 sm:px-6">
          <Link href="/entrar" aria-label="Maratona 21: voltar para o aplicativo">
            <Wordmark />
          </Link>
          <Link
            href="/entrar"
            aria-label="Voltar ao app"
            className="inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap text-[0.95rem] font-semibold text-cocoa underline-offset-4 hover:underline"
          >
            Voltar<span className="hidden min-[400px]:inline">&nbsp;ao app</span>
          </Link>
        </div>
      </header>

      <main id="conteudo" className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6">
        <p className="eyebrow">Maratona 21</p>
        <h1 className="mt-2 font-serif text-[2.1rem] font-semibold leading-tight sm:text-[2.6rem]">{title}</h1>
        <p className="mt-2 text-[0.95rem] text-mute">Última atualização: {LEGAL_UPDATED_AT}</p>

        {LEGAL_REVIEW_PENDING ? (
          <p role="note" className="mt-5 rounded-xl border border-gold/50 bg-gold/10 px-4 py-3 text-[0.95rem] text-cocoa">
            Versão preliminar, sujeita a revisão jurídica.
          </p>
        ) : null}

        <div className="mt-6 text-[1.0625rem] leading-relaxed text-cocoa">{intro}</div>

        <div className="legal mt-8 space-y-8">{children}</div>

        <footer className="mt-12 border-t border-sand pt-6 text-[0.95rem] text-mute">
          <p>
            {RESPONSIBLE.company} · CNPJ {RESPONSIBLE.cnpj} · {RESPONSIBLE.brand}
          </p>
          <p className="mt-1">
            Contato:{" "}
            <a className="font-semibold text-cocoa underline underline-offset-4" href={`mailto:${RESPONSIBLE.email}`}>
              {RESPONSIBLE.email}
            </a>
          </p>
          <LegalLinks className="mt-4" />
        </footer>
      </main>
    </div>
  );
}

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="scroll-mt-6">
      <h2 id={id} className="font-serif text-[1.6rem] font-semibold leading-snug text-ink">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[1.0625rem] leading-relaxed text-cocoa [&_li]:mt-1.5 [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
        {children}
      </div>
    </section>
  );
}

/** "Política de Privacidade · Termos de Uso": usado no login e no rodapé das páginas legais. */
export function LegalLinks({ className = "", tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const link = `inline-flex min-h-[44px] items-center underline-offset-4 hover:underline focus-visible:underline ${
    tone === "dark" ? "text-cocoa" : "text-mute"
  }`;
  return (
    <nav aria-label="Documentos legais" className={`flex flex-wrap items-center justify-center gap-x-2 text-[0.875rem] ${className}`}>
      <Link href="/politica-de-privacidade" className={link}>
        Política de Privacidade
      </Link>
      <span aria-hidden="true" className="text-taupe">
        ·
      </span>
      <Link href="/termos-de-uso" className={link}>
        Termos de Uso
      </Link>
    </nav>
  );
}
