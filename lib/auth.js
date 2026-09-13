import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import db from "./db";

const authBaseURL =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000";

const socialProviders = {};

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  };
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  };
}

export const auth = betterAuth({
  baseURL: authBaseURL,
  trustedOrigins: [authBaseURL],
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  socialProviders,
  // 🔒 Invite-only: only users who already have an account can sign in.
  // Remove `disableSignUp` (or set it to false) to open public signups.
  disableSignUp: true,
  // 🚦 Brute-force protection on auth endpoints (sign-in, sign-up).
  // Keyed by IP + endpoint; stored in Postgres so it survives restarts and
  // multiple instances. Requires the `rateLimit` table (see schema.prisma).
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/social": { window: 60, max: 20 },
    },
  },
  advanced: {
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for", "x-real-ip"],
    },
  },
});