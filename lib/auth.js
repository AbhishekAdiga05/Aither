import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import db from "./db";

// Canonical public origin of the deployed app (e.g. "https://myapp.netlify.app").
// - Set in production so OAuth redirects / callbacks are pinned to the right host.
// - Unset locally: better-auth derives the origin from EACH request, so signing
//   in works from localhost AND from a phone on the same LAN with zero config.
const authBaseURL = (process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").trim();

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
  // Only pin the base URL when a canonical public origin is configured.
  // When it isn't, better-auth resolves it from the incoming request instead.
  ...(authBaseURL ? { baseURL: authBaseURL } : {}),
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  socialProviders,
  // Allow new users to sign up via social providers.
  disableSignUp: false,
  // Send OAuth failures (e.g. cancelled at Google, signup disabled for a new
  // account) back to the sign-in page instead of better-auth's raw error page.
  onAPIError: {
    errorURL: "/sign-in",
  },
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