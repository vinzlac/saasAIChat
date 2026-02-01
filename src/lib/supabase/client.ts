import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase pour les composants client (browser).
 * Utilisé pour signInWithOAuth afin que le code verifier PKCE soit stocké
 * dans les cookies du navigateur avant la redirection OAuth.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
