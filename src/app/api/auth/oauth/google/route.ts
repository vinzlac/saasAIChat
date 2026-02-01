import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Initie la connexion OAuth Google via Supabase Auth.
 * Redirige vers Google, puis Supabase redirige vers /auth/callback avec le code.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") ?? "/app";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getAppUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    console.error("OAuth Google error:", error);
    return NextResponse.redirect(
      new URL("/login?error=oauth", request.url)
    );
  }

  if (!data.url) {
    return NextResponse.redirect(
      new URL("/login?error=oauth", request.url)
    );
  }

  return NextResponse.redirect(data.url);
}
