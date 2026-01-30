import { createClient } from "@supabase/supabase-js";

/**
 * Admin client with service role - use ONLY for:
 * - Writing assistant messages
 * - System jobs
 * - Webhooks
 * - Admin operations
 *
 * NEVER use for standard user CRUD
 */
export function createAdminClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
