import { NextResponse, type NextRequest } from "next/server";
import { getAccess } from "@/lib/access";
import { FOOD_COLUMNS, normalizeFood } from "@/lib/data/queries";
import { searchTokens } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Busca no catálogo (servidor). O catálogo nunca é carregado inteiro no navegador. */
export async function GET(request: NextRequest) {
  const access = await getAccess();
  if (access.kind !== "ok") return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  const tokens = searchTokens(q);
  if (tokens.length === 0) return NextResponse.json({ foods: [] });

  const db = await createClient();
  const { data, error } = await db.rpc("search_foods", { p_tokens: tokens, p_query: q, p_limit: 25 }).select(FOOD_COLUMNS);
  if (error) {
    console.error("[search]", error.message);
    return NextResponse.json({ error: "search_failed" }, { status: 500 });
  }
  return NextResponse.json(
    { foods: ((data ?? []) as unknown as Record<string, unknown>[]).map(normalizeFood) },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
