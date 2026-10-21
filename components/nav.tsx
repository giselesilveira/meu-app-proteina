"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "./brand";
import { IconCalendar, IconChart, IconPlus, IconShield, IconToday, IconUser } from "./icons";

const ITEMS = [
  { href: "/", label: "Hoje", Icon: IconToday },
  { href: "/registrar", label: "Registrar", Icon: IconPlus },
  { href: "/historico", label: "Histórico", Icon: IconCalendar },
  { href: "/evolucao", label: "Evolução", Icon: IconChart },
  { href: "/perfil", label: "Perfil", Icon: IconUser },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[68px] flex-col items-center justify-center gap-1 whitespace-nowrap text-[clamp(0.8125rem,3.6vw,0.875rem)] font-semibold ${
                  active ? "text-gold" : "text-sand/75 hover:text-cream"
                }`}
              >
                {href === "/registrar" ? (
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full ${active ? "bg-gold text-ink" : "bg-copper text-ivory"}`}>
                    <Icon size={22} />
                  </span>
                ) : (
                  <Icon size={24} />
                )}
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-ink px-5 py-8 lg:flex">
      <Wordmark tone="light" className="px-3" />
      <nav aria-label="Navegação principal" className="mt-10 flex-1">
        <ul className="space-y-1">
          {ITEMS.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-[52px] items-center gap-3 rounded-xl px-3 font-semibold ${
                    active ? "bg-white/10 text-gold" : "text-sand/80 hover:bg-white/5 hover:text-cream"
                  }`}
                >
                  <Icon size={22} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {isAdmin ? (
        <Link href="/admin" className="flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-sm font-semibold text-sand/70 hover:text-cream">
          <IconShield size={20} /> Administração
        </Link>
      ) : null}
      <p className="px-3 text-sm text-sand/60">Seu painel diário de progresso.</p>
    </aside>
  );
}
