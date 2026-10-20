import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/webhooks|favicon.ico|icons/|fonts/|.*\\.(?:png|jpg|svg|webp|ico|woff2)$).*)"],
};
