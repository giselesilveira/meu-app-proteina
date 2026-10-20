import { existsSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

/** Carrega .env.local (ou .env) e cria o cliente com service role — só para scripts locais. */
export function adminClientFromEnv() {
  for (const f of [".env.local", ".env"]) {
    const p = path.resolve(__dirname, "../..", f);
    if (existsSync(p)) {
      process.loadEnvFile(p);
      break;
    }
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local antes de importar.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
