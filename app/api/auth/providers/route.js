import { NextResponse } from "next/server";

// Reports which social OAuth providers are actually configured on the server.
// Non-sensitive: only returns provider names, never credentials. Lets the
// sign-in page warn when a provider's env vars are missing (which would
// otherwise surface as a confusing 404 "Provider not found").
export function GET() {
  const providers = ["github", "google"].filter((provider) => {
    const key = provider.toUpperCase();
    return Boolean(
      process.env[`${key}_CLIENT_ID`] &&
        process.env[`${key}_CLIENT_SECRET`],
    );
  });
  return NextResponse.json({ providers });
}