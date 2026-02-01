import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Callback OAuth Supabase - échange le code contre une session.
 * Appelé après connexion Google (ou autre provider OAuth).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/app";

  if (!next.startsWith("/")) {
    next = "/app";
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_invalid", request.url)
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/login?error=oauth", request.url)
    );
  }

  // Utiliser le Host de la requête pour rester sur le même domaine (évite 127.0.0.1 vs localhost)
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const protocol = request.headers.get("x-forwarded-proto") === "https" ? "https" : request.nextUrl.protocol;
  const baseUrl = `${protocol}//${host}`;

  return NextResponse.redirect(`${baseUrl}${next}`);
}
