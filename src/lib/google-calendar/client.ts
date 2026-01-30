import { db } from "@/db";
import { oauthConnections } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { decrypt } from "@/lib/encryption";
import { refreshAccessToken } from "@/lib/oauth/google";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export async function getCalendarClient(userId: string): Promise<{
  getEvents: (params: {
    timeMin?: string;
    timeMax?: string;
    singleEvents?: boolean;
  }) => Promise<unknown[]>;
}> {
  const [connection] = await db
    .select()
    .from(oauthConnections)
    .where(
      and(
        eq(oauthConnections.userId, userId),
        eq(oauthConnections.provider, "google_calendar")
      )
    )
    .limit(1);

  if (!connection) {
    throw new Error("Google Calendar non connecté");
  }

  let accessToken = await decrypt(connection.accessToken);
  const tokenExpiresAt = connection.tokenExpiresAt;

  if (
    tokenExpiresAt &&
    new Date(tokenExpiresAt) < new Date(Date.now() + 5 * 60 * 1000)
  ) {
    if (connection.refreshToken) {
      const refresh = await decrypt(connection.refreshToken);
      const tokens = await refreshAccessToken(refresh);
      accessToken = tokens.access_token;

      const { encrypt } = await import("@/lib/encryption");
      const encryptedAccess = await encrypt(tokens.access_token);
      const expiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null;

      await db
        .update(oauthConnections)
        .set({
          accessToken: encryptedAccess,
          tokenExpiresAt: expiresAt,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(oauthConnections.userId, userId),
            eq(oauthConnections.provider, "google_calendar")
          )
        );
    }
  }

  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };

  return {
    async getEvents(params) {
      const searchParams = new URLSearchParams();
      searchParams.set("singleEvents", "true");
      searchParams.set("orderBy", "startTime");
      if (params.timeMin) searchParams.set("timeMin", params.timeMin);
      if (params.timeMax) searchParams.set("timeMax", params.timeMax);

      const res = await fetch(
        `${CALENDAR_API}/calendars/primary/events?${searchParams}`,
        { headers }
      );

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Token expiré. Reconnectez Google Calendar.");
        }
        throw new Error(`Google Calendar API error: ${res.status}`);
      }

      const data = await res.json();
      return data.items ?? [];
    },
  };
}
