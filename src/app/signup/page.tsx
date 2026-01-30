import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/server";
import { SignupForm } from "@/components/auth/signup-form";

export default async function SignupPage() {
  const user = await getUser();
  if (user?.email_confirmed_at) {
    redirect("/app");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <SignupForm />
    </main>
  );
}
