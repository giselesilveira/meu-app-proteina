import { EntitlementActions, ManualGrantForm } from "@/components/admin/access";
import { Card, Notice } from "@/components/ui";
import { requireAdmin } from "@/lib/access";
import { accessState, formatAccessUntil, type AccessState } from "@/lib/access-period";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const dt = (v: string | null) =>
  v ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(v)) : "—";

interface Ent {
  id: string;
  user_id: string | null;
  email: string;
  source: string;
  product_ucode: string | null;
  offer_code: string | null;
  transaction: string | null;
  status: string;
  granted_at: string;
  revoked_at: string | null;
  revoke_reason: string | null;
  access_expires_at: string | null;
  purchase_approved_at: string | null;
  granted_by: string | null;
  reason: string | null;
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireAdmin(); // layout e página rodam em paralelo: cada página checa de novo
  const { q = "", status = "" } = await searchParams;
  const term = q.trim().toLowerCase().slice(0, 100);
  const db = createAdminClient();

  let ents: Ent[] = [];
  let names = new Map<string, string | null>();
  let failed = false;
  try {
    let emails: string[] | null = null;
    if (term) {
      const safe = term.replace(/[%_,()]/g, "");
      const { data: byName } = await db.from("profiles").select("email").ilike("full_name", `%${safe}%`).limit(200);
      emails = (byName ?? []).map((p) => p.email as string);
      let query = db.from("entitlements").select("*").order("created_at", { ascending: false }).limit(200);
      query = emails.length ? query.or(`email.ilike.%${safe}%,email.in.(${emails.map((e) => `"${e}"`).join(",")})`) : query.ilike("email", `%${safe}%`);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      ents = (data ?? []) as Ent[];
    } else {
      const query = db.from("entitlements").select("*").order("created_at", { ascending: false }).limit(status ? 500 : 100);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      ents = (data ?? []) as Ent[];
    }
    // "Expirado" é calculado pela data de vencimento (o status gravado continua "active").
    if (status) ents = ents.filter((e) => accessState(e) === status);
    const allEmails = [...new Set(ents.map((e) => e.email))];
    if (allEmails.length) {
      const { data: profiles } = await db.from("profiles").select("email, full_name").in("email", allEmails);
      names = new Map((profiles ?? []).map((p) => [p.email as string, p.full_name as string | null]));
    }
  } catch (e) {
    console.error("[admin]", e instanceof Error ? e.message : e);
    failed = true;
  }

  const { count: activeCount } = await db
    .from("entitlements")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .or(`access_expires_at.is.null,access_expires_at.gt.${new Date().toISOString()}`);
  const { count: profileCount } = await db.from("profiles").select("user_id", { count: "exact", head: true });

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm font-semibold uppercase tracking-widest text-taupe">Acessos ativos</p>
          <p className="tabular text-3xl font-bold">{activeCount ?? "—"}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold uppercase tracking-widest text-taupe">Alunas que já entraram</p>
          <p className="tabular text-3xl font-bold">{profileCount ?? "—"}</p>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 text-lg font-bold">Liberar acesso manual</h2>
        <ManualGrantForm />
      </Card>

      <section>
        <form className="mb-4 flex flex-wrap gap-2" role="search">
          <input name="q" defaultValue={q} placeholder="Buscar por nome ou e-mail" className="input max-w-md flex-1" aria-label="Buscar por nome ou e-mail" />
          <select name="status" defaultValue={status} className="input w-44" aria-label="Status">
            <option value="">Todos</option>
            <option value="active">Ativos</option>
            <option value="expired">Expirados</option>
            <option value="revoked">Revogados</option>
          </select>
          <button className="min-h-[56px] rounded-xl bg-ink px-6 font-semibold text-cream">Buscar</button>
        </form>
        {failed ? <Notice tone="error">Não foi possível carregar os acessos.</Notice> : null}
        <div className="overflow-x-auto rounded-2xl border border-sand bg-ivory">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-sand/60 text-xs uppercase tracking-wider text-cocoa">
              <tr>
                <th className="px-3 py-3">Aluna</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Origem</th>
                <th className="px-3 py-3">Transação / produto / oferta</th>
                <th className="px-3 py-3">Liberação</th>
                <th className="px-3 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {ents.map((e) => (
                <tr key={e.id} className="align-top">
                  <td className="px-3 py-3">
                    <p className="font-semibold">{names.get(e.email) ?? "—"}</p>
                    <p className="text-mute">{e.email}</p>
                    <p className="text-xs text-taupe">{e.user_id ? "Já entrou no app" : "Ainda não entrou"}</p>
                  </td>
                  <td className="px-3 py-3">
                    <StateBadge state={accessState(e)} />
                    {e.access_expires_at ? (
                      <p className="mt-1 text-xs text-mute">
                        {accessState(e) === "expired" ? "venceu em" : "até"} {formatAccessUntil(e.access_expires_at)}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-mute">sem data de término</p>
                    )}
                    {e.revoke_reason ? <p className="mt-1 text-xs text-mute">{e.revoke_reason}</p> : null}
                  </td>
                  <td className="px-3 py-3">
                    {e.source}
                    {e.granted_by ? <p className="text-xs text-mute">por {e.granted_by}</p> : null}
                    {e.reason ? <p className="text-xs text-mute">{e.reason}</p> : null}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">
                    <p>{e.transaction ?? "—"}</p>
                    <p className="text-mute">{e.product_ucode ?? "—"}</p>
                    <p className="text-mute">{e.offer_code ?? "—"}</p>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <p>liberado {dt(e.granted_at)}</p>
                    {e.purchase_approved_at ? <p className="text-mute">compra aprovada {dt(e.purchase_approved_at)}</p> : null}
                    {e.revoked_at ? <p className="text-mute">revogado {dt(e.revoked_at)}</p> : null}
                  </td>
                  <td className="px-3 py-3">
                    <EntitlementActions id={e.id} state={accessState(e)} />
                  </td>
                </tr>
              ))}
              {ents.length === 0 && !failed ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-mute">
                    Nenhum acesso encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const STATE_LABEL: Record<AccessState, { label: string; cls: string }> = {
  active: { label: "Ativo", cls: "bg-copper/15 text-copper-dark" },
  expired: { label: "Expirado", cls: "bg-gold/25 text-cocoa" },
  revoked: { label: "Revogado", cls: "bg-danger/10 text-danger" },
};

function StateBadge({ state }: { state: AccessState }) {
  const s = STATE_LABEL[state];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${s.cls}`}>{s.label}</span>;
}
