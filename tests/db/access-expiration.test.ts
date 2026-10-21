/**
 * Prazo de 6 meses no banco: migração 20261022000001, preenchimento retroativo da compra
 * já existente, regra SQL = regra TypeScript e bloqueio por vencimento.
 * Rodar: DATABASE_URL_TEST=postgres://… npm run test:db
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessPeriodEnd } from "@/lib/access-period";

const ADMIN_URL = process.env.DATABASE_URL_TEST;
const DB_NAME = `m21_exp_${process.pid}`;
const root = path.resolve(__dirname, "../..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");
const UID = "44444444-4444-4444-8444-444444444444";
const MIGRATION = "supabase/migrations/20261022000001_access_expiration.sql";

let admin: Client;
let db: Client;
const describeDb = ADMIN_URL ? describe : describe.skip;

async function hasAccess(uid: string) {
  await db.query("begin");
  try {
    await db.query("set local role authenticated");
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [uid]);
    const r = await db.query("select public.has_active_access() ok");
    return r.rows[0].ok as boolean;
  } finally {
    await db.query("rollback");
  }
}

describeDb("banco: prazo de acesso de 6 meses", () => {
  beforeAll(async () => {
    admin = new Client({ connectionString: ADMIN_URL });
    await admin.connect();
    await admin.query(`drop database if exists ${DB_NAME}`);
    await admin.query(`create database ${DB_NAME}`);
    const url = new URL(ADMIN_URL!);
    url.pathname = `/${DB_NAME}`;
    db = new Client({ connectionString: url.toString() });
    await db.connect();
    await db.query(read("supabase/tests/supabase_stub.sql"));
    await db.query(read("supabase/migrations/20261020000001_init.sql")); // banco como está hoje em produção
    await db.query("insert into auth.users (id, email, email_confirmed_at) values ($1, 'real@example.com', now())", [UID]);
    // Estado ANTES da migração: compra real aprovada, acesso sem prazo
    await db.query(`insert into public.entitlements (email, user_id, source, transaction, product_ucode, status, granted_at)
      values ('real@example.com', $1, 'hotmart', 'HP-REAL', 'S108130437C', 'active', '2026-10-21T15:05:00Z'),
             ('semevento@example.com', null, 'hotmart', 'HP-SEM-EVENTO', 'S108130437C', 'active', '2026-10-10T13:00:00Z'),
             ('tombstone@example.com', null, 'hotmart', 'HP-TOMB', 'S108130437C', 'revoked', '2026-10-11T13:00:00Z'),
             ('manual@example.com', null, 'manual', null, null, 'active', '2026-10-01T13:00:00Z')`, [UID]);
    await db.query(`insert into public.webhook_events (provider, external_event_id, event_type, transaction, payload, processing_status) values
      ('hotmart', 'real-1', 'PURCHASE_APPROVED', 'HP-REAL', '{"data":{"purchase":{"transaction":"HP-REAL","approved_date":1792584000000}}}', 'processed'),
      ('hotmart', 'tomb-1', 'PURCHASE_REFUNDED', 'HP-TOMB', '{"data":{"purchase":{"transaction":"HP-TOMB"}}}', 'processed')`);
    // 1792584000000 ms = 2026-10-21 09:00 (São Paulo)
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${DB_NAME}`);
    await admin?.end();
  });

  it("antes da migração, a compra real não tem vencimento", async () => {
    const r = await db.query("select access_expires_at from public.entitlements where transaction = 'HP-REAL'");
    expect(r.rows[0].access_expires_at).toBeNull();
  });

  it("migração preenche a compra real pela approved_date da Hotmart, sem criar novo acesso", async () => {
    await db.query(read(MIGRATION));
    const r = await db.query(
      "select count(*)::int n, min(purchase_approved_at) ap, min(access_expires_at) ex from public.entitlements where email = 'real@example.com'",
    );
    expect(r.rows[0].n).toBe(1);
    expect(new Date(r.rows[0].ap).toISOString()).toBe("2026-10-21T12:00:00.000Z");
    expect(new Date(r.rows[0].ex).toISOString()).toBe(accessPeriodEnd(new Date("2026-10-21T12:00:00Z")).toISOString());
    expect(new Date(r.rows[0].ex).toISOString()).toBe("2027-04-22T03:00:00.000Z"); // acesso até 21/04/2027
    expect(await hasAccess(UID)).toBe(true);
  });

  it("sem evento de aprovação, usa a data de liberação; revogação sem aprovação e acesso manual não mudam", async () => {
    const r = await db.query("select transaction, source, purchase_approved_at, access_expires_at from public.entitlements order by email");
    const by = Object.fromEntries(r.rows.map((x) => [x.transaction ?? x.source, x]));
    expect(new Date(by["HP-SEM-EVENTO"].access_expires_at).toISOString()).toBe("2027-04-11T03:00:00.000Z");
    expect(by["HP-TOMB"].access_expires_at).toBeNull();
    expect(by["manual"].access_expires_at).toBeNull();
  });

  it("rodar a migração de novo não altera nada (idempotente, nunca prorroga)", async () => {
    const before = await db.query("select id, access_expires_at, purchase_approved_at from public.entitlements order by id");
    await db.query(read(MIGRATION));
    const after = await db.query("select id, access_expires_at, purchase_approved_at from public.entitlements order by id");
    expect(after.rows).toEqual(before.rows);
  });

  it("regra SQL = regra TypeScript (fins de mês, bissexto, virada de dia em UTC)", async () => {
    const samples = [
      "2026-03-15T17:30:00Z",
      "2026-08-31T13:00:00Z",
      "2026-09-01T02:30:00Z", // 31/08 23h30 em São Paulo
      "2027-08-31T13:00:00Z",
      "2026-12-31T23:00:00Z",
      "2026-02-28T12:00:00Z",
      "2028-02-29T12:00:00Z",
    ];
    for (const s of samples) {
      const r = await db.query("select public.access_period_end($1::timestamptz, 6) e", [s]);
      expect(new Date(r.rows[0].e).toISOString(), s).toBe(accessPeriodEnd(new Date(s)).toISOString());
    }
  });

  it("vencido = sem acesso (dados preservados); prorrogação devolve o acesso", async () => {
    await db.query("insert into public.body_checkins (user_id, checkin_date, weight_kg) values ($1, '2026-10-21', 70)", [UID]);
    await db.query("update public.entitlements set access_expires_at = now() - interval '1 second' where transaction = 'HP-REAL'");
    expect(await hasAccess(UID)).toBe(false);
    expect((await db.query("select count(*)::int n from public.body_checkins where user_id = $1", [UID])).rows[0].n).toBe(1);
    await db.query("update public.entitlements set access_expires_at = now() + interval '30 days' where transaction = 'HP-REAL'");
    expect(await hasAccess(UID)).toBe(true);
  });

  it("compras sobrepostas: vale a de vencimento mais distante; uma vencida não reduz a outra", async () => {
    await db.query(`insert into public.entitlements (email, user_id, source, transaction, status, purchase_approved_at, access_expires_at)
      values ('real@example.com', $1, 'hotmart', 'HP-REAL-2', 'active', now(), now() + interval '6 months')`, [UID]);
    await db.query("update public.entitlements set access_expires_at = now() - interval '1 day' where transaction = 'HP-REAL'");
    expect(await hasAccess(UID)).toBe(true);
    await db.query("update public.entitlements set status = 'revoked' where transaction = 'HP-REAL-2'");
    expect(await hasAccess(UID)).toBe(false);
  });

  it("access_period_end não é exposta a alunas", async () => {
    await db.query("begin");
    try {
      await db.query("set local role authenticated");
      await expect(db.query("select public.access_period_end(now(), 6)")).rejects.toThrow(/permission denied/);
    } finally {
      await db.query("rollback");
    }
  });
});
