/**
 * Testes contra PostgreSQL real: migrations, RLS, entitlement e snapshot.
 * Rodar: DATABASE_URL_TEST=postgres://postgres@localhost:54329/postgres npm run test:db
 * (o teste cria e apaga um banco temporário próprio; ver SETUP.md, seção "Testes").
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { consumedFor } from "@/lib/nutrition";

const ADMIN_URL = process.env.DATABASE_URL_TEST;
const DB_NAME = `m21_test_${process.pid}`;
const root = path.resolve(__dirname, "../..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");

const ANA = "11111111-1111-4111-8111-111111111111";
const BIA = "22222222-2222-4222-8222-222222222222";
const SEM = "33333333-3333-4333-8333-333333333333";

let admin: Client;
let db: Client;

async function asUser<T>(uid: string, fn: (c: Client) => Promise<T>): Promise<T> {
  await db.query("begin");
  try {
    await db.query("set local role authenticated");
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [uid]);
    const result = await fn(db);
    await db.query("commit");
    return result;
  } catch (e) {
    await db.query("rollback");
    throw e;
  }
}

async function asAnon<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  await db.query("begin");
  try {
    await db.query("set local role anon");
    const r = await fn(db);
    await db.query("commit");
    return r;
  } catch (e) {
    await db.query("rollback");
    throw e;
  }
}

const describeDb = ADMIN_URL ? describe : describe.skip;

describeDb("banco: migrations + RLS", () => {
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
    await db.query(read("supabase/migrations/20261020000001_init.sql"));
    await db.query(read("supabase/seed/taco_food_catalog.sql"));

    await db.query(
      `insert into auth.users (id, email, email_confirmed_at) values
       ($1, 'ana@example.com', now()), ($2, 'bia@example.com', now()), ($3, 'sem@example.com', now())`,
      [ANA, BIA, SEM],
    );
    // Compras registradas pelo webhook ANTES do primeiro login (user_id nulo)
    await db.query(
      `insert into public.entitlements (email, source, transaction, product_ucode, status) values
       ('ana@example.com', 'hotmart', 'HP-ANA', 'prod', 'active'),
       ('bia@example.com', 'hotmart', 'HP-BIA', 'prod', 'active')`,
    );
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${DB_NAME}`);
    await admin?.end();
  });

  it("seed TACO é idempotente (rodar de novo não duplica)", async () => {
    await db.query(read("supabase/seed/taco_food_catalog.sql"));
    const { rows } = await db.query("select count(*)::int n from public.food_catalog");
    expect(rows[0].n).toBe(597);
  });

  it("sem entitlement: login funciona mas não há acesso a nada", async () => {
    const claimed = await asUser(SEM, (c) => c.query("select public.claim_my_entitlements() ok"));
    expect(claimed.rows[0].ok).toBe(false);
    const foods = await asUser(SEM, (c) => c.query("select count(*)::int n from public.food_catalog"));
    expect(foods.rows[0].n).toBe(0);
    await expect(
      asUser(SEM, (c) =>
        c.query(
          "insert into public.nutrition_profiles (user_id, weight_kg, protein_factor, protein_target_g) values ($1, 70, 1.5, 105)",
          [SEM],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("primeiro login associa o entitlement ao usuário, cria profile e é idempotente", async () => {
    for (let i = 0; i < 2; i++) {
      const r = await asUser(ANA, (c) => c.query("select public.claim_my_entitlements() ok"));
      expect(r.rows[0].ok).toBe(true);
    }
    await asUser(BIA, (c) => c.query("select public.claim_my_entitlements()"));
    const { rows } = await db.query("select email, user_id from public.entitlements order by email");
    expect(rows).toEqual([
      { email: "ana@example.com", user_id: ANA },
      { email: "bia@example.com", user_id: BIA },
    ]);
    const profiles = await db.query("select count(*)::int n from public.profiles where user_id = $1", [ANA]);
    expect(profiles.rows[0].n).toBe(1);
  });

  it("e-mail do profile não pode ser alterado pela aluna", async () => {
    await expect(
      asUser(ANA, (c) => c.query("update public.profiles set email = 'outro@example.com' where user_id = $1", [ANA])),
    ).rejects.toThrow(/permission denied/);
    await asUser(ANA, (c) => c.query("update public.profiles set full_name = 'Ana' where user_id = $1", [ANA]));
    const r = await db.query("select full_name, email from public.profiles where user_id = $1", [ANA]);
    expect(r.rows[0]).toEqual({ full_name: "Ana", email: "ana@example.com" });
  });

  it("aluna não consegue se dar acesso nem ver entitlements de outra", async () => {
    await expect(
      asUser(SEM, (c) =>
        c.query("insert into public.entitlements (email, source, status) values ('sem@example.com','manual','active')"),
      ),
    ).rejects.toThrow(/permission denied/);
    const seen = await asUser(ANA, (c) => c.query("select email from public.entitlements"));
    expect(seen.rows).toEqual([{ email: "ana@example.com" }]);
  });

  let frangoId: string;
  let entryId: string;

  it("registro de alimento: snapshot vem do catálogo, nunca do cliente", async () => {
    const f = await db.query("select id from public.food_catalog where taco_code = 410");
    frangoId = f.rows[0].id;
    const r = await asUser(ANA, (c) =>
      c.query(
        `insert into public.food_entries (food_id, entry_date, amount_g, food_name_snapshot,
           protein_per_100g_snapshot, calories_per_100g_snapshot, protein_snapshot, calories_snapshot, source_snapshot)
         values ($1, '2026-10-20', 120, 'FALSO', 999, 999, 999, 999, '{}') returning *`,
        [frangoId],
      ),
    );
    const e = r.rows[0];
    entryId = e.id;
    expect(e.user_id).toBe(ANA);
    expect(e.food_name_snapshot).toBe("Peito de frango sem pele, grelhado");
    expect(Number(e.protein_per_100g_snapshot)).toBe(32);
    const expected = consumedFor({ protein_per_100g: 32, calories_per_100g: 159, fat_per_100g: 2.5 }, 120);
    // mesma fórmula no banco e em lib/nutrition.ts
    expect(Number(e.protein_snapshot)).toBeCloseTo(expected.protein, 3);
    expect(Number(e.calories_snapshot)).toBeCloseTo(expected.calories, 3);
    expect(Number(e.fat_snapshot)).toBeCloseTo(expected.fat!, 3);
    expect(e.source_snapshot).toMatchObject({ source_type: "TACO", taco_code: 410 });
  });

  it("alterar o catálogo NÃO altera o histórico; editar quantidade usa o snapshot", async () => {
    await db.query("update public.food_catalog set protein_per_100g = 50 where taco_code = 410");
    const before = await db.query("select protein_snapshot from public.food_entries where id = $1", [entryId]);
    expect(Number(before.rows[0].protein_snapshot)).toBeCloseTo(38.4, 3);
    const upd = await asUser(ANA, (c) =>
      c.query(
        "update public.food_entries set amount_g = 150, protein_per_100g_snapshot = 80 where id = $1 returning protein_snapshot, protein_per_100g_snapshot",
        [entryId],
      ),
    );
    expect(Number(upd.rows[0].protein_per_100g_snapshot)).toBe(32);
    expect(Number(upd.rows[0].protein_snapshot)).toBeCloseTo(48, 3);
    await db.query("update public.food_catalog set protein_per_100g = 32 where taco_code = 410");
  });

  it("isolamento: uma aluna não lê, altera nem apaga dados da outra", async () => {
    await asUser(BIA, (c) =>
      c.query("insert into public.body_checkins (checkin_date, weight_kg) values ('2026-10-19', 80)"),
    );
    const anaSees = await asUser(ANA, (c) => c.query("select * from public.body_checkins"));
    expect(anaSees.rowCount).toBe(0);
    const biaEntries = await asUser(BIA, (c) => c.query("select * from public.food_entries"));
    expect(biaEntries.rowCount).toBe(0);
    const upd = await asUser(BIA, (c) => c.query("update public.food_entries set amount_g = 1 where id = $1", [entryId]));
    expect(upd.rowCount).toBe(0);
    const del = await asUser(BIA, (c) => c.query("delete from public.food_entries where id = $1", [entryId]));
    expect(del.rowCount).toBe(0);
    await expect(
      asUser(BIA, (c) =>
        c.query("insert into public.favorite_foods (user_id, food_id) values ($1, $2)", [ANA, frangoId]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("visitante anônimo não acessa nada", async () => {
    await expect(asAnon((c) => c.query("select * from public.food_catalog"))).rejects.toThrow(/permission denied/);
    await expect(asAnon((c) => c.query("select public.claim_my_entitlements()"))).rejects.toThrow(/permission denied/);
  });

  it("tabelas de servidor (webhook_events, admin_audit_log) são invisíveis para alunas", async () => {
    await expect(asUser(ANA, (c) => c.query("select * from public.webhook_events"))).rejects.toThrow(/permission denied/);
    await expect(asUser(ANA, (c) => c.query("select * from public.admin_audit_log"))).rejects.toThrow(
      /permission denied/,
    );
  });

  it("revogação bloqueia o acesso e preserva os dados; reativação devolve tudo", async () => {
    await db.query("update public.entitlements set status = 'revoked', revoked_at = now() where transaction = 'HP-ANA'");
    const blocked = await asUser(ANA, (c) => c.query("select public.claim_my_entitlements() ok"));
    expect(blocked.rows[0].ok).toBe(false);
    const hidden = await asUser(ANA, (c) => c.query("select count(*)::int n from public.food_entries"));
    expect(hidden.rows[0].n).toBe(0);
    const preserved = await db.query("select count(*)::int n from public.food_entries where user_id = $1", [ANA]);
    expect(preserved.rows[0].n).toBe(1);

    await db.query("update public.entitlements set status = 'active', revoked_at = null where transaction = 'HP-ANA'");
    const back = await asUser(ANA, (c) => c.query("select count(*)::int n from public.food_entries"));
    expect(back.rows[0].n).toBe(1);
  });

  it("acesso com data de expiração vencida não vale", async () => {
    await db.query("update public.entitlements set access_expires_at = now() - interval '1 day' where transaction = 'HP-BIA'");
    const r = await asUser(BIA, (c) => c.query("select public.has_active_access() ok"));
    expect(r.rows[0].ok).toBe(false);
    await db.query("update public.entitlements set access_expires_at = null where transaction = 'HP-BIA'");
  });

  it("has_access_for(uuid) de terceiros não é exposto às alunas", async () => {
    await expect(asUser(ANA, (c) => c.query("select public.has_access_for($1)", [BIA]))).rejects.toThrow(
      /permission denied/,
    );
  });

  it("busca respeita RLS e encontra por termos fora de ordem", async () => {
    const r = await asUser(ANA, (c) =>
      c.query("select display_name from public.search_foods($1, $2, 5)", [["frang", "peit", "grelhad"], "frango peito grelhado"]),
    );
    expect(r.rows.map((x) => x.display_name)).toContain("Peito de frango sem pele, grelhado");
    const none = await asUser(SEM, (c) =>
      c.query("select count(*)::int n from public.search_foods($1, $2, 5)", [["frang"], "frango"]),
    );
    expect(none.rows[0].n).toBe(0);
  });

  it("alimento inativo não pode ser registrado", async () => {
    const inactive = await db.query("select id from public.food_catalog where taco_code = 458"); // leite integral (*)
    await expect(
      asUser(ANA, (c) =>
        c.query("insert into public.food_entries (food_id, entry_date, amount_g, food_name_snapshot, protein_per_100g_snapshot, calories_per_100g_snapshot, protein_snapshot, calories_snapshot, source_snapshot) values ($1, '2026-10-20', 100, '', 0,0,0,0,'{}')", [inactive.rows[0].id]),
      ),
    ).rejects.toThrow(/food_not_available/);
  });
});
