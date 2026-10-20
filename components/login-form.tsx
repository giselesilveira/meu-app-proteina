"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { requestLoginCode, verifyLoginCode } from "@/app/entrar/actions";
import { Button, Notice } from "./ui";

export function LoginForm({ linkError }: { linkError?: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(linkError ? "O link expirou ou já foi usado. Peça um novo código." : null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setInfo(null);
    start(async () => {
      const res = await requestLoginCode(email);
      if (!res.ok) return setError(res.error);
      setStep("code");
      setInfo("Enviamos um código para o seu e-mail. Confira também a caixa de spam ou promoções.");
    });
  }

  function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await verifyLoginCode(email, code);
      if (!res.ok) return setError(res.error);
      router.replace("/");
      router.refresh();
    });
  }

  if (step === "code") {
    return (
      <form onSubmit={verify} noValidate>
        <h2 className="font-serif text-[2rem] font-semibold">Digite o código</h2>
        <p className="mt-1 text-mute">
          Enviado para <strong className="text-ink">{email.trim().toLowerCase()}</strong>
        </p>
        {info ? (
          <div className="mt-4">
            <Notice tone="success">{info}</Notice>
          </div>
        ) : null}
        <label htmlFor="code" className="label mt-6">
          Código recebido
        </label>
        <input
          id="code"
          className="input text-center text-[1.6rem] font-bold tracking-[0.4em]"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={10}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          autoFocus
        />
        {error ? (
          <div className="mt-4">
            <Notice tone="error">{error}</Notice>
          </div>
        ) : null}
        <Button type="submit" loading={pending} disabled={code.length < 6} className="mt-6 w-full">
          Entrar
        </Button>
        <p className="mt-3 text-center text-sm text-mute">Você também pode tocar no link do e-mail para entrar.</p>
        <div className="mt-6 flex flex-col gap-2">
          <Button type="button" variant="ghost" onClick={() => sendCode()} disabled={pending}>
            Enviar novo código
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
              setInfo(null);
            }}
          >
            Usar outro e-mail
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} noValidate>
      <h2 className="font-serif text-[2rem] font-semibold">Entrar</h2>
      <p className="mt-1 text-mute">Sem senha: você recebe um código no e-mail.</p>
      <label htmlFor="email" className="label mt-6">
        Seu e-mail
      </label>
      <input
        id="email"
        type="email"
        className="input"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        placeholder="nome@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <p className="mt-2 font-semibold text-cocoa">Use o mesmo e-mail utilizado na sua compra.</p>
      {error ? (
        <div className="mt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}
      <Button type="submit" loading={pending} disabled={!email.includes("@")} className="mt-6 w-full">
        Receber código
      </Button>
    </form>
  );
}
