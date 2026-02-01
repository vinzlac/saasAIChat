import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Ordre : DATABASE_URL > POSTGRES_URL > POSTGRES_PRISMA_URL > SUPABASE_DB_URL
// Sur Vercel, POSTGRES_URL peut ne pas être dispo au runtime → ajouter DATABASE_URL explicitement
const connectionString = (
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.SUPABASE_DB_URL ??
  ""
).trim();

if (!connectionString) {
  throw new Error(
    "No database URL. Add DATABASE_URL in Vercel (Settings > Environment Variables) " +
      "with the Supabase pooler URL from Dashboard > Project Settings > Database (Transaction mode, port 6543)."
  );
}

if (
  process.env.VERCEL &&
  (connectionString.includes("127.0.0.1") || connectionString.includes("localhost"))
) {
  throw new Error(
    "Database URL points to localhost. Use Supabase pooler URL (port 6543). " +
      "Copy from Supabase Dashboard > Project Settings > Database > Connection string (Transaction)."
  );
}

const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });

export * from "./schema";
