import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Callback OAuth Supabase - échange le code contre une session.
 * Appelé après connexion Google (ou autre provider OAuth).
 *
 * IMPORTANT: On utilise request.cookies / response.cookies explicitement
 * (comme le middleware) au lieu de cookies() de next/headers, car sur Vercel
 * le code verifier PKCE doit être lu depuis la requête réelle pour que
 * exchangeCodeForSession trouve le cookie.
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

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("OAuth callback: SUPABASE_URL or SUPABASE_ANON_KEY missing");
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }

  // Créer la réponse de redirection à l'avance - le client Supabase va y écrire les cookies de session
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host;
  const protocol =
    request.headers.get("x-forwarded-proto") === "https" ? "https:" : "http:";
  const baseUrl = `${protocol}//${host}`;
  const redirectUrl = `${baseUrl}${next}`;
  const response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            response.cookies.set(name, value)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }

  return response;
}
