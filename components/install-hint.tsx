"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "./ui";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

/** Instalação na tela inicial: botão no Android/desktop; instruções no iPhone. */
export function InstallHint() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(true);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    );
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (standalone || (!deferred && !ios)) return null;

  return (
    <Card className="p-5">
      <h2 className="text-lg font-bold">Coloque o app na tela inicial</h2>
      {deferred ? (
        <>
          <p className="mt-1 text-mute">Abra a Maratona 21 com um toque, como um aplicativo.</p>
          <Button className="mt-4 w-full" onClick={() => deferred.prompt().finally(() => setDeferred(null))}>
            Instalar na tela inicial
          </Button>
        </>
      ) : (
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-cocoa">
          <li>No Safari, toque no botão Compartilhar (quadrado com seta para cima).</li>
          <li>Escolha “Adicionar à Tela de Início”.</li>
          <li>Toque em “Adicionar”.</li>
        </ol>
      )}
    </Card>
  );
}
