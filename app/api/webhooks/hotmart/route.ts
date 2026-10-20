import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/env";
import { processHotmartWebhook } from "@/lib/hotmart/process";
import { createSupabaseHotmartRepo } from "@/lib/hotmart/supabase-repo";
import { sendWelcomeEmail } from "@/lib/mail/welcome";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 256 * 1024;

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, result: "payload_too_large" }, { status: 413 });
  }

  let result;
  try {
    result = await processHotmartWebhook(
      { rawBody, hottokHeader: request.headers.get("x-hotmart-hottok") },
      {
        repo: createSupabaseHotmartRepo(createAdminClient()),
        config: {
          hottok: serverEnv.hotmartHottok,
          allowedProductUcodes: serverEnv.hotmartAllowedProducts(),
          allowedOfferCodes: serverEnv.hotmartAllowedOffers(),
        },
        sendWelcomeEmail,
        log: (message, extra) => console.error(`[hotmart] ${message}`, extra ?? ""),
      },
    );
  } catch (error) {
    console.error("[hotmart] erro inesperado", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, result: "failed" }, { status: 500 });
  }
  return NextResponse.json(result.body, { status: result.status });
}

export function GET() {
  return NextResponse.json({ ok: true, endpoint: "hotmart-webhook" });
}
