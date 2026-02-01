import Link from "next/link";
import { redirect } from "next/navigation";

type HomePageProps = {
  searchParams?: { code?: string; next?: string };
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const code = searchParams?.code;
  const next = searchParams?.next ?? "/app";

  if (code) {
    redirect(`/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">SaaS AI Chat</h1>
      <p className="text-muted-foreground mb-8 text-center max-w-md">
        Discutez avec un assistant IA et connectez votre Google Calendar pour
        gérer vos rendez-vous.
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Connexion
        </Link>
        <Link
          href="/signup"
          className="rounded-md border border-input bg-background px-4 py-2 hover:bg-accent"
        >
          Inscription
        </Link>
      </div>
    </main>
  );
}
