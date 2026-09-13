import { existsSync } from "node:fs";
import { resolve } from "node:path";

try {
  for (const file of [".env.local", ".env.production", ".env"]) {
    const path = resolve(file);
    if (existsSync(path) && typeof process.loadEnvFile === "function") {
      process.loadEnvFile(path);
    }
  }
} catch {
  // .env files are optional; CI platforms inject env vars directly.
}

const REQUIRED = [
  ["DATABASE_URL", "Postgres connection string used by Prisma and better-auth."],
  ["BETTER_AUTH_SECRET", "Signs session JWTs. Use a random string of 32+ chars. better-auth refuses to run without it in production."],
];

const ALTERNATIVES = [
  {
    names: ["BETTER_AUTH_URL", "NEXT_PUBLIC_APP_URL"],
    hint: "Optional in local dev (sign-in auto-detects the origin). Set it in production to your public origin, e.g. https://your-site.netlify.app, so OAuth callback URLs are stable.",
  },
];

const WARNINGS = {
  GITHUB_CLIENT_ID: "GitHub OAuth sign-in will be disabled.",
  GITHUB_CLIENT_SECRET: "GitHub OAuth sign-in will be disabled.",
  GOOGLE_CLIENT_ID: "Google OAuth sign-in will be disabled.",
  GOOGLE_CLIENT_SECRET: "Google OAuth sign-in will be disabled.",
  OPENROUTER_API_KEY: "Chat requests will fail at runtime.",
};

const has = (v) => typeof v === "string" && v.trim().length > 0;

const missing = [];
for (const [key, why] of REQUIRED) {
  if (!has(process.env[key])) missing.push([key, why]);
}

for (const { names, hint } of ALTERNATIVES) {
  if (names.every((n) => !has(process.env[n]))) {
    missing.push([names.join(" / "), hint]);
  }
}

if (missing.length > 0) {
  console.error("\n[x] Missing required environment variables:");
  for (const [key, why] of missing) {
    console.error(`    - ${key}: ${why}`);
  }
  console.error(
    "\nSet them in your hosting provider's environment settings, then redeploy.\n",
  );
  process.exit(1);
}

const warned = Object.entries(WARNINGS).filter(
  ([key]) => !has(process.env[key]),
);
if (warned.length > 0) {
  console.warn("\n[!] Optional environment variables not set:");
  for (const [key, why] of warned) {
    console.warn(`    - ${key}: ${why}`);
  }
  console.warn("Set them if you need the associated feature.\n");
}

console.log("[ok] Required environment variables are present.");