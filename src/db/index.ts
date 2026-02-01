import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// DATABASE_URL ou POSTGRES_URL / POSTGRES_PRISMA_URL (Vercel + Supabase les fournit automatiquement)
const connectionString =
  process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
  throw new Error(
    "No database URL found. Set DATABASE_URL, or connect Supabase in Vercel (provides POSTGRES_URL)."
  );
}

// En prod (Vercel), refuser les URLs localhost
if (
  process.env.VERCEL &&
  (connectionString.includes("127.0.0.1") || connectionString.includes("localhost"))
) {
  throw new Error(
    "DATABASE_URL points to localhost. For production, use the Supabase Cloud pooler URL " +
      "(e.g. postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-xx.pooler.supabase.com:6543/postgres)"
  );
}

const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });

export * from "./schema";
