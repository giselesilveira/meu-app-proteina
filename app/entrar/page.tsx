import { redirect } from "next/navigation";
import { Wordmark } from "@/components/brand";
import { LoginForm } from "@/components/login-form";
import { getAccess } from "@/lib/access";
import { isAdminUser } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const access = await getAccess();
  if (access.kind === "ok") redirect("/");
  if (access.kind === "no_access") redirect(isAdminUser(access.user, process.env.ADMIN_EMAILS) ? "/admin" : "/sem-acesso");
  const { erro } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col bg-ink text-cream lg:flex-row">
      <section className="flex flex-col justify-between px-6 pb-10 pt-12 sm:px-10 lg:w-1/2 lg:py-16">
        <Wordmark tone="light" />
        <div className="mt-12 max-w-md lg:mt-0">
          <p className="eyebrow text-gold">Black do Emagrecimento</p>
          <h1 className="mt-3 font-serif text-[2.6rem] font-semibold leading-[1.1] text-cream sm:text-[3.2rem]">
            Seu painel diário de progresso.
          </h1>
          <p className="mt-4 text-[1.1rem] text-sand/85">Sua meta, o que você já consumiu, o que ainda falta e a sua evolução, salvos para você.</p>
        </div>
        <p className="mt-10 hidden text-sm text-sand/50 lg:block">Exclusivo para alunas da Maratona de Emagrecimento de 21 Dias.</p>
      </section>
      <section className="flex flex-1 items-start justify-center rounded-t-[2rem] bg-cream px-6 py-10 text-ink sm:px-10 lg:items-center lg:rounded-none">
        <div className="w-full max-w-md">
          <LoginForm linkError={erro === "link"} />
          <p className="mt-8 text-center text-sm text-mute">
            Este aplicativo é exclusivo para alunas da Nutri Gisele Silveira. O compartilhamento do acesso não é permitido.
          </p>
        </div>
      </section>
    </main>
  );
}
