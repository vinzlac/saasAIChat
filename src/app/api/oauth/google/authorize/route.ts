import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthorizeUrl } from "@/lib/oauth/google";
import { randomBytes } from "crypto";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const state = randomBytes(32).toString("hex");

    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    cookieStore.set("oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    cookieStore.set("oauth_user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    const url = getAuthorizeUrl(state);
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("OAuth authorize error:", error);
    return NextResponse.redirect(
      new URL("/app/settings?error=oauth", request.url)
    );
  }
}
