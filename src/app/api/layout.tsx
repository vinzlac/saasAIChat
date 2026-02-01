/**
 * Layout API - force dynamic pour toutes les routes API (cookies, auth, etc.)
 * Évite les erreurs "Dynamic server usage: Route used cookies" lors du build
 */
export const dynamic = "force-dynamic";

export default function ApiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
