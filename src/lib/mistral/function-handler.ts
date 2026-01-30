import {
  getTodayEvents,
  getCalendarEvents,
  getUpcomingEvents,
} from "@/lib/google-calendar/functions";

export type FunctionCall = {
  name: string;
  arguments: string;
};

export async function executeFunction(
  userId: string,
  call: FunctionCall
): Promise<string> {
  try {
    switch (call.name) {
      case "get_today_events": {
        const events = await getTodayEvents(userId);
        return JSON.stringify(events, null, 2);
      }
      case "get_calendar_events": {
        const args = JSON.parse(call.arguments || "{}");
        const events = await getCalendarEvents(
          userId,
          args.date,
          args.timeMin,
          args.timeMax
        );
        return JSON.stringify(events, null, 2);
      }
      case "get_upcoming_events": {
        const args = JSON.parse(call.arguments || "{}");
        const days = Math.min(Math.max(args.days ?? 7, 1), 30);
        const events = await getUpcomingEvents(userId, days);
        return JSON.stringify(events, null, 2);
      }
      default:
        return JSON.stringify({ error: `Fonction inconnue: ${call.name}` });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return JSON.stringify({ error: message });
  }
}
