import { createAuthClient } from "better-auth/react";

// Only point the client at a fixed base URL when one is baked in for the
// deployed app (NEXT_PUBLIC_*). In local dev we intentionally leave it unset so
// better-auth targets the browser's own origin — making sign-in work from
// localhost AND from a phone on the same network.
const authBaseURL = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();

const authClientConfig = authBaseURL
  ? { baseURL: authBaseURL }
  : {};

export const { signIn, signUp, useSession, signOut } =
  createAuthClient(authClientConfig);
