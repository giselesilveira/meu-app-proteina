import { Wordmark } from "@/components/brand";
import { ButtonLink } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Algo não saiu como esperado" };

export default function ErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6">
      <div className="max-w-sm text-center">
        <Wordmark className="mb-8 inline-block" />
        <h1 className="font-serif text-[2rem] font-semibold">Não conseguimos carregar seus dados agora.</h1>
        <p className="mt-3 text-mute">Tente novamente em instantes.</p>
        <ButtonLink href="/" className="mt-6">
          Tentar novamente
        </ButtonLink>
      </div>
    </main>
  );
}
