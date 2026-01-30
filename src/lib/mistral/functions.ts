import type { MistralTool } from "./client";

export const mistralTools: MistralTool[] = [
  {
    type: "function",
    function: {
      name: "get_today_events",
      description: "Récupère tous les événements du calendrier pour aujourd'hui",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_calendar_events",
      description:
        "Récupère les événements du calendrier pour une période donnée",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Date au format ISO 8601 (YYYY-MM-DD)",
          },
          timeMin: {
            type: "string",
            description: "Heure de début au format ISO 8601 (optionnel)",
          },
          timeMax: {
            type: "string",
            description: "Heure de fin au format ISO 8601 (optionnel)",
          },
        },
        required: ["date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_upcoming_events",
      description:
        "Récupère les prochains événements pour un nombre de jours donné",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "integer",
            description: "Nombre de jours à partir d'aujourd'hui",
            minimum: 1,
            maximum: 30,
          },
        },
        required: ["days"],
      },
    },
  },
];
