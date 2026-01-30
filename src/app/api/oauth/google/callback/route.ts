import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { oauthConnections } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { exchangeCodeForTokens } from "@/lib/oauth/google";
import { encrypt } from "@/lib/encryption";

const PROVIDER = "google_calendar";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const storedState = cookieStore.get("oauth_state")?.value;
  const userId = cookieStore.get("oauth_user_id")?.value;

  cookieStore.delete("oauth_state");
  cookieStore.delete("oauth_user_id");

  if (!code || !state || state !== storedState || !userId) {
    return NextResponse.redirect(
      new URL("/app/settings?error=oauth_invalid", request.url)
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const encryptedAccess = await encrypt(tokens.access_token);
    const encryptedRefresh = tokens.refresh_token
      ? await encrypt(tokens.refresh_token)
      : null;

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    await db
      .delete(oauthConnections)
      .where(
        and(
          eq(oauthConnections.userId, userId),
          eq(oauthConnections.provider, PROVIDER)
        )
      );

    await db.insert(oauthConnections).values({
      userId,
      provider: PROVIDER,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      tokenExpiresAt: expiresAt,
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    });

    return NextResponse.redirect(new URL("/app/settings?oauth=success", request.url));
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/app/settings?error=oauth_failed", request.url)
    );
  }
}
