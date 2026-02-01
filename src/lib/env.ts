/**
 * URL de base de l'app.
 * - En prod (Vercel) : utilise VERCEL_URL (définie automatiquement)
 * - En local : utilise APP_URL (.env.local) — VERCEL_URL n'existe pas localement
 */
export function getAppUrl(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return process.env.APP_URL || "http://localhost:3000";
}
