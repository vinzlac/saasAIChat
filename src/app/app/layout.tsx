import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AppNav } from "@/components/layout/app-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!user.email_confirmed_at) redirect("/verify-email");

  let [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  // Fallback : créer le profil si absent (trigger non exécuté ou OAuth)
  if (!profile) {
    const meta = user.user_metadata ?? {};
    const firstName =
      (meta.first_name as string) ??
      (meta.given_name as string) ??
      (typeof meta.full_name === "string" ? meta.full_name.split(" ")[0] ?? "" : "") ??
      "Utilisateur";
    const lastName =
      (meta.last_name as string) ??
      (meta.family_name as string) ??
      (typeof meta.full_name === "string" ? meta.full_name.split(" ").slice(1).join(" ") ?? "" : "") ??
      "";
    const [created] = await db
      .insert(profiles)
      .values({
        userId: user.id,
        firstName: String(firstName).trim() || "Utilisateur",
        lastName: String(lastName).trim() || "",
      })
      .returning();
    profile = created ?? undefined;
  }

  const userData = {
    email: user.email ?? "",
    first_name: profile?.firstName,
    last_name: profile?.lastName,
    profile_picture_url: profile?.profilePictureUrl,
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-16 items-center gap-6 px-4">
          <Link href="/app" className="font-semibold text-lg shrink-0">
            SaaS AI Chat
          </Link>
          <AppNav />
          <div className="flex-1" />
          <ThemeToggle />
          <UserMenu user={userData} />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
