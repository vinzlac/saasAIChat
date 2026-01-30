import { getCalendarClient } from "./client";

export async function getTodayEvents(userId: string) {
  const client = await getCalendarClient(userId);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const events = await client.getEvents({
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
  });

  return events;
}

export async function getCalendarEvents(
  userId: string,
  date: string,
  timeMin?: string,
  timeMax?: string
) {
  const client = await getCalendarClient(userId);
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const events = await client.getEvents({
    timeMin: timeMin ?? start.toISOString(),
    timeMax: timeMax ?? end.toISOString(),
  });

  return events;
}

export async function getUpcomingEvents(userId: string, days: number) {
  const client = await getCalendarClient(userId);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setDate(end.getDate() + days);
  end.setHours(23, 59, 59, 999);

  const events = await client.getEvents({
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
  });

  return events;
}
