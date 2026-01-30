/**
 * Script de setup local : démarre Supabase, valorise .env.local, applique les migrations
 */

import { execSync, spawnSync } from "child_process";
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "fs";
import { randomBytes } from "crypto";
import { join } from "path";

const ROOT = join(process.cwd());
const ENV_EXAMPLE = join(ROOT, ".env.local.example");
const ENV_LOCAL = join(ROOT, ".env.local");

const SUPABASE_KEY_MAP: Record<string, string> = {
  API_URL: "SUPABASE_URL",
  ANON_KEY: "SUPABASE_ANON_KEY",
  PUBLISHABLE_KEY: "SUPABASE_ANON_KEY",
  SERVICE_ROLE_KEY: "SUPABASE_SERVICE_ROLE_KEY",
  SECRET_KEY: "SUPABASE_SERVICE_ROLE_KEY",
  DB_URL: "DATABASE_URL",
};

function run(cmd: string, options?: { stdio?: "inherit" | "pipe" }): string {
  try {
    const result = execSync(cmd, {
      encoding: "utf-8",
      stdio: options?.stdio ?? "pipe",
    });
    return typeof result === "string" ? result : "";
  } catch (e) {
    const err = e as { stderr?: string; message?: string };
    throw new Error(err.stderr || err.message || String(e));
  }
}

function parseEnvOutput(output: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1).replace(/\\"/g, '"');
    }
    vars[key] = value;
  }
  return vars;
}

function parseEnvFile(content: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

function generateEncryptionKey(): string {
  return randomBytes(16).toString("hex");
}

function main() {
  console.log("=== Setup local SaaS AI Chat ===\n");

  if (!existsSync(ENV_EXAMPLE)) {
    console.error("Fichier .env.local.example introuvable.");
    process.exit(1);
  }

  // Charger .env.local pour que Supabase (config.toml) ait accès à GOOGLE_CLIENT_ID/SECRET, etc.
  const envForSupabase = { ...process.env };
  if (existsSync(ENV_LOCAL)) {
    const existing = parseEnvFile(readFileSync(ENV_LOCAL, "utf-8"));
    for (const [k, v] of Object.entries(existing)) {
      if (v) envForSupabase[k] = v;
    }
  }

  console.log("1. Démarrage de Supabase...");
  const startResult = spawnSync("npx", ["supabase", "start"], {
    stdio: "inherit",
    cwd: ROOT,
    env: envForSupabase,
  });

  if (startResult.status !== 0) {
    console.error("\nErreur: Supabase n'a pas pu démarrer.");
    console.error("Vérifiez que Docker est lancé: docker info");
    process.exit(1);
  }

  console.log("\n2. Extraction des variables Supabase...");
  let statusOutput: string;
  try {
    statusOutput = run("npx supabase status -o env", { stdio: "pipe" });
  } catch (e) {
    console.error("Erreur lors de supabase status:", e);
    process.exit(1);
  }

  const supabaseVars = parseEnvOutput(statusOutput);
  const envVars: Record<string, string> = {};

  for (const [supabaseKey, ourKey] of Object.entries(SUPABASE_KEY_MAP)) {
    const value = supabaseVars[supabaseKey];
    if (value) envVars[ourKey] = value;
  }

  if (!envVars.SUPABASE_URL || !envVars.SUPABASE_ANON_KEY) {
    if (envVars.DATABASE_URL || supabaseVars.DB_URL) {
      console.log("   Certains services Supabase sont arrêtés. Utilisation des valeurs par défaut pour le dev local.");
      envVars.DATABASE_URL = envVars.DATABASE_URL || supabaseVars.DB_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
      envVars.SUPABASE_URL = envVars.SUPABASE_URL || "http://127.0.0.1:54321";
      envVars.SUPABASE_ANON_KEY =
        envVars.SUPABASE_ANON_KEY ||
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjN43kdQwgnWNReilDMblYTn_I0";
      envVars.SUPABASE_SERVICE_ROLE_KEY =
        envVars.SUPABASE_SERVICE_ROLE_KEY ||
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
    } else {
      console.error("Variables Supabase manquantes. Vérifiez que supabase start a réussi.");
      console.error("Essayez: npm run supabase:stop && npm run supabase:start");
      process.exit(1);
    }
  }

  envVars.APP_URL = envVars.APP_URL || "http://localhost:3000";

  const placeholderEncryption = /^your-32-character|^your-.*-key$/i;
  if (existsSync(ENV_LOCAL)) {
    const existing = parseEnvFile(readFileSync(ENV_LOCAL, "utf-8"));
    for (const [k, v] of Object.entries(existing)) {
      if (!envVars[k] && v && !placeholderEncryption.test(v)) {
        envVars[k] = v;
      }
    }
  }

  if (!envVars.ENCRYPTION_KEY || placeholderEncryption.test(envVars.ENCRYPTION_KEY)) {
    envVars.ENCRYPTION_KEY = generateEncryptionKey();
    console.log("   ENCRYPTION_KEY générée automatiquement.");
  }

  const exampleVars = parseEnvFile(readFileSync(ENV_EXAMPLE, "utf-8"));
  const merged: Record<string, string> = { ...exampleVars, ...envVars };

  const sections = [
    { comment: "# Database", keys: ["DATABASE_URL"] },
    { comment: "# Supabase (local - no NEXT_PUBLIC_* variables)", keys: ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"] },
    { comment: "# Mistral", keys: ["MISTRAL_API_KEY"] },
    { comment: "# Google OAuth", keys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"] },
    { comment: "# Encryption (minimum 32 characters for AES-256)", keys: ["ENCRYPTION_KEY"] },
    { comment: "# App URL (for OAuth redirects - server-side only)", keys: ["APP_URL"] },
  ];

  const lines: string[] = [];
  for (const { comment, keys } of sections) {
    lines.push(comment);
    for (const key of keys) {
      lines.push(`${key}=${merged[key] ?? ""}`);
    }
    lines.push("");
  }

  const envContent = lines.join("\n").trimEnd() + "\n";
  writeFileSync(ENV_LOCAL, envContent);
  // .env pour que Supabase CLI charge les variables (GOOGLE_*, etc.) au démarrage
  writeFileSync(join(ROOT, ".env"), envContent);
  console.log("   .env.local et .env mis à jour.\n");

  console.log("3. Application des migrations...");
  try {
    execSync("npx drizzle-kit migrate", {
      stdio: "inherit",
      env: { ...process.env, ...merged },
    });
  } catch (e) {
    console.error("Erreur lors des migrations:", e);
    process.exit(1);
  }

  console.log("\n=== Setup terminé ===\n");
  console.log("Variables valorisées automatiquement:");
  console.log("  - DATABASE_URL");
  console.log("  - SUPABASE_URL");
  console.log("  - SUPABASE_ANON_KEY");
  console.log("  - SUPABASE_SERVICE_ROLE_KEY");
  console.log("  - ENCRYPTION_KEY");
  console.log("  - APP_URL\n");
  console.log("Variables à renseigner manuellement dans .env.local:");
  console.log("  - MISTRAL_API_KEY (https://console.mistral.ai/)");
  console.log("  - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (optionnel, pour Google Calendar)\n");
  console.log("Lancez l'app avec: npm run dev");
}

main();
