"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error.digest ?? "erro");
  }, [error]);
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <h1 className="font-serif text-[2rem] font-semibold">Não conseguimos carregar seus dados agora.</h1>
        <p className="mt-3 text-mute">
          {typeof navigator !== "undefined" && !navigator.onLine
            ? "Você parece estar sem internet. Confira a conexão."
            : "Tente novamente em instantes."}
        </p>
        <Button onClick={reset} className="mt-6">
          Tentar novamente
        </Button>
      </div>
    </main>
  );
}
