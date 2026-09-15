import { createAuthClient } from "better-auth/react";

// Client auth uses relative paths (/api/auth) targeting the current window's origin,
// which avoids cross-origin fetch issues and works seamlessly across localhost,
// LAN IPs, deploy previews, and custom domains.
export const { signIn, signUp, useSession, signOut } = createAuthClient();

