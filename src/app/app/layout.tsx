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

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

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
