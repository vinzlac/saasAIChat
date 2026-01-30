import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/app";

  const validTypes = ["signup", "email", "recovery"];
  if (!token_hash || !type || !validTypes.includes(type)) {
    return NextResponse.redirect(
      new URL("/verify-email?error=invalid", request.url)
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type: type as "email" | "recovery",
  });

  if (error) {
    if (error.message.includes("expired")) {
      return NextResponse.redirect(
        new URL("/verify-email?error=expired", request.url)
      );
    }
    return NextResponse.redirect(
      new URL("/verify-email?error=invalid", request.url)
    );
  }

  if (type === "recovery") {
    return NextResponse.redirect(new URL("/reset-password", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
