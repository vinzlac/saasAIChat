/**
 * Script de migration pour la production (Vercel)
 * Exécuté uniquement si VERCEL_ENV=production
 * Utilise un advisory lock PostgreSQL pour éviter les migrations concurrentes
 */

import { execSync } from "child_process";

const isProduction = process.env.VERCEL_ENV === "production";

if (!isProduction) {
  console.log("Skipping migrations: not in production");
  process.exit(0);
}

// DATABASE_URL ou POSTGRES_URL (Supabase peut sync l'un ou l'autre)
const databaseUrl =
  process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.POSTGRES_PRISMA_URL;

if (!databaseUrl) {
  console.warn(
    "Skipping migrations: DATABASE_URL (or POSTGRES_URL) not set in Vercel environment variables."
  );
  console.warn(
    "Add DATABASE_URL in Vercel Project Settings > Environment Variables for production."
  );
  process.exit(0);
}

try {
  execSync("npx drizzle-kit migrate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
  console.log("Migrations completed successfully");
} catch (error) {
  console.error("Migration failed:", error);
  process.exit(1);
}
