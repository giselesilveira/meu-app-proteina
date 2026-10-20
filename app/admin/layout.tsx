import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { requireAdmin } from "@/lib/access";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administração" };

const LINKS = [
  { href: "/admin", label: "Alunas e acessos" },
  { href: "/admin/alimentos", label: "Catálogo de alimentos" },
  { href: "/admin/webhooks", label: "Eventos Hotmart" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-ink px-4 py-5 text-cream sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Wordmark tone="light" />
            <span className="rounded-full bg-copper px-3 py-1 text-xs font-bold uppercase tracking-widest">Admin</span>
          </div>
          <p className="text-sm text-sand/70">{admin.email}</p>
        </div>
        <nav aria-label="Administração" className="mx-auto mt-4 flex max-w-6xl flex-wrap gap-2">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">
              {l.label}
            </Link>
          ))}
          <Link href="/" className="rounded-lg px-4 py-2 text-sm font-semibold text-sand/70 hover:text-cream">
            Voltar ao app
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
