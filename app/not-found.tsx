import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <h1 className="font-serif text-[2rem] font-semibold">Página não encontrada</h1>
        <p className="mt-3 text-mute">O endereço pode ter mudado.</p>
        <ButtonLink href="/" className="mt-6">
          Voltar para o início
        </ButtonLink>
      </div>
    </main>
  );
}
