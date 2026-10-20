import { redirect } from "next/navigation";
import { Wordmark } from "@/components/brand";
import { ButtonLink, Card } from "@/components/ui";
import { getAccess } from "@/lib/access";
import { supportHref, withBasePath } from "@/lib/public-config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Acesso não encontrado" };

export default async function NoAccessPage() {
  const access = await getAccess();
  if (access.kind === "anonymous") redirect("/entrar");
  if (access.kind === "ok") redirect("/");
  const email = access.kind === "no_access" ? access.user.email : null;
  const reason = access.kind === "no_access" ? access.reason : "none";
  const support = supportHref();

  const title =
    reason === "revoked"
      ? "Seu acesso não está mais ativo."
      : reason === "expired"
        ? "O período do seu acesso terminou."
        : "Não encontramos um acesso ativo para este e-mail.";

  return (
    <main className="flex min-h-screen items-start justify-center bg-cream px-4 py-12 sm:items-center">
      <div className="w-full max-w-md">
        <Wordmark className="mb-8" />
        <Card className="p-6">
          <h1 className="font-serif text-[1.9rem] font-semibold leading-tight">{title}</h1>
          {email ? (
            <p className="mt-3 text-mute">
              Você entrou com <strong className="text-ink">{email}</strong>.
            </p>
          ) : null}
          <p className="mt-3">
            {reason === "none"
              ? "Confira se você está utilizando o mesmo e-mail informado na compra."
              : "Seus registros continuam guardados. Se acredita que isso é um engano, fale com o suporte."}
          </p>
          {reason === "none" ? (
            <p className="mt-2 text-sm text-mute">Se a compra acabou de ser feita, a liberação pode levar alguns minutos.</p>
          ) : null}
          <div className="mt-6 flex flex-col gap-3">
            {support ? (
              <ButtonLink href={support} variant="primary" target="_blank" rel="noreferrer">
                Falar com o suporte
              </ButtonLink>
            ) : null}
            <form action={withBasePath("/auth/sair")} method="post">
              <button type="submit" className="min-h-[56px] w-full rounded-xl border border-bark/25 bg-ivory font-semibold">
                Entrar com outro e-mail
              </button>
            </form>
          </div>
        </Card>
      </div>
    </main>
  );
}
