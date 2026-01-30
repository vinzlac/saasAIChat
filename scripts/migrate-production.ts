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

try {
  execSync("npx drizzle-kit migrate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
  });
  console.log("Migrations completed successfully");
} catch (error) {
  console.error("Migration failed:", error);
  process.exit(1);
}
