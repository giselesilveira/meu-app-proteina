import Link from "next/link";
import { Notice } from "@/components/ui";
import { requireAdmin } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const dt = (v: string | null) =>
  v ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium", timeZone: "America/Sao_Paulo" }).format(new Date(v)) : "—";

const STATUSES = ["", "processed", "ignored", "failed", "received"];

export default async function AdminWebhooksPage({ searchParams }: { searchParams: Promise<{ status?: string; tx?: string }> }) {
  await requireAdmin();
  const { status = "", tx = "" } = await searchParams;
  const db = createAdminClient();
  let query = db
    .from("webhook_events")
    .select("id, external_event_id, event_type, transaction, processing_status, attempts, received_at, processed_at, error_message, payload")
    .order("received_at", { ascending: false })
    .limit(100);
  if (status) query = query.eq("processing_status", status);
  if (tx.trim()) query = query.eq("transaction", tx.trim());
  const { data, error } = await query;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s || "all"}
            href={s ? `/admin/webhooks?status=${s}` : "/admin/webhooks"}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${status === s ? "bg-ink text-cream" : "bg-ivory text-cocoa"}`}
          >
            {s || "Todos"}
          </Link>
        ))}
        <form className="flex gap-2">
          <input name="tx" defaultValue={tx} className="input min-h-[40px] w-56 text-sm" placeholder="Transação (HP...)" aria-label="Transação" />
        </form>
      </div>
      {error ? <Notice tone="error">Não foi possível carregar os eventos.</Notice> : null}
      <div className="overflow-x-auto rounded-2xl border border-sand bg-ivory">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-sand/60 text-xs uppercase tracking-wider text-cocoa">
            <tr>
              <th className="px-3 py-3">Recebido</th>
              <th className="px-3 py-3">Evento</th>
              <th className="px-3 py-3">Transação</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Detalhe / erro</th>
              <th className="px-3 py-3">Payload</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand">
            {(data ?? []).map((e) => (
              <tr key={e.id} className="align-top">
                <td className="px-3 py-3 text-xs">
                  {dt(e.received_at)}
                  <p className="text-mute">tentativas: {e.attempts}</p>
                </td>
                <td className="px-3 py-3 font-mono text-xs">
                  {e.event_type}
                  <p className="text-mute">{e.external_event_id}</p>
                </td>
                <td className="px-3 py-3 font-mono text-xs">{e.transaction ?? "—"}</td>
                <td className="px-3 py-3 text-xs font-bold">{e.processing_status}</td>
                <td className="max-w-xs px-3 py-3 text-xs text-mute">{e.error_message ?? "—"}</td>
                <td className="px-3 py-3 text-xs">
                  <details>
                    <summary className="cursor-pointer font-semibold">ver</summary>
                    <pre className="mt-2 max-h-64 max-w-md overflow-auto whitespace-pre-wrap rounded bg-sand/50 p-2">{JSON.stringify(e.payload, null, 2)}</pre>
                  </details>
                </td>
              </tr>
            ))}
            {(data ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-mute">
                  Nenhum evento recebido.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
