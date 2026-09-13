import { NextResponse } from "next/server";

const SESSION_COOKIES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];

// Presence check only — real session enforcement happens server-side
// (API returns 401 / page redirects). This just avoids flashing the app
// shell to unauthenticated visitors and stops crawlers.
function hasSessionCookie(request) {
  return SESSION_COOKIES.some((name) => request.cookies.get(name));
}

const nonceSource = (nonce) =>
  process.env.NODE_ENV === "production"
    ? `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://lh3.googleusercontent.com https://avatars.githubusercontent.com; font-src 'self' data:; connect-src 'self'; media-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;`
    : null;

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const isProtectedPage = pathname === "/" || pathname.startsWith("/chat");

  // Auth gate for app pages.
  if (isProtectedPage && !hasSessionCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Nonce for Next's inline scripts/styles (CSP) + hardening headers.
  const nonce = crypto.randomUUID();
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.headers.set("x-nonce", nonce);

  const csp = nonceSource(nonce);
  if (csp) {
    response.headers.set("Content-Security-Policy", csp);
  }

  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("x-frame-options", "DENY");

  return response;
}

export const config = {
  matcher: [
    // Run on pages (/, /sign-in, /chat/*) but skip Next internals, static
    // assets, and API routes (better-auth + chat streams stay untouched).
    "/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?|map)$).*)",
  ],
};