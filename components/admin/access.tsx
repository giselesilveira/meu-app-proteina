"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { grantManualAccess, reactivateEntitlement, revokeEntitlement } from "@/app/admin/actions";
import { Button, Notice } from "../ui";

export function EntitlementActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="space-y-1">
      {status === "active" ? (
        <Button
          variant="danger"
          className="min-h-[40px] px-3 text-sm"
          loading={pending}
          onClick={() => {
            const reason = window.prompt("Motivo da revogação:");
            if (reason === null) return;
            start(async () => {
              const r = await revokeEntitlement(id, reason);
              setMsg(r.ok ? (r.message ?? "") : r.error);
              router.refresh();
            });
          }}
        >
          Revogar
        </Button>
      ) : (
        <Button
          variant="secondary"
          className="min-h-[40px] px-3 text-sm"
          loading={pending}
          onClick={() =>
            start(async () => {
              const r = await reactivateEntitlement(id);
              setMsg(r.ok ? (r.message ?? "") : r.error);
              router.refresh();
            })
          }
        >
          Reativar
        </Button>
      )}
      {msg ? <p className="text-xs text-mute">{msg}</p> : null}
    </div>
  );
}

export function ManualGrantForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-3 sm:grid-cols-[2fr_2fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await grantManualAccess({ email, reason, expiresAt: expiresAt || null });
          setMsg(r.ok ? { tone: "success", text: r.message ?? "Liberado." } : { tone: "error", text: r.error });
          if (r.ok) {
            setEmail("");
            setReason("");
            setExpiresAt("");
            router.refresh();
          }
        });
      }}
    >
      <div>
        <label className="label" htmlFor="mg-email">
          E-mail
        </label>
        <input id="mg-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <label className="label" htmlFor="mg-reason">
          Motivo
        </label>
        <input id="mg-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} required />
      </div>
      <div>
        <label className="label" htmlFor="mg-exp">
          Expira em (opcional)
        </label>
        <input id="mg-exp" type="date" className="input" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
      </div>
      <Button type="submit" loading={pending}>
        Liberar
      </Button>
      {msg ? (
        <div className="sm:col-span-4">
          <Notice tone={msg.tone}>{msg.text}</Notice>
        </div>
      ) : null}
    </form>
  );
}
