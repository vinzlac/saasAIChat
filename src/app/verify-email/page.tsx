import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/server";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";

export default async function VerifyEmailPage() {
  const user = await getUser();
  if (user?.email_confirmed_at) {
    redirect("/app");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <VerifyEmailForm />
    </main>
  );
}
