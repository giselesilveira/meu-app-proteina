import { Wordmark } from "@/components/brand";

export const dynamic = "force-static";
export const metadata = { title: "Sem conexão" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6">
      <div className="max-w-sm text-center">
        <Wordmark className="mb-8 inline-block" />
        <h1 className="font-serif text-[2rem] font-semibold">Você está sem internet</h1>
        <p className="mt-3 text-mute">Seus dados estão guardados com segurança. Assim que a conexão voltar, é só tocar abaixo.</p>
        <a href="./" className="mt-6 inline-flex min-h-[56px] items-center justify-center rounded-xl bg-ink px-6 font-semibold text-cream">
          Tentar novamente
        </a>
      </div>
    </main>
  );
}
