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
    ? `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://*.googleusercontent.com https://*.githubusercontent.com; font-src 'self' data:; connect-src 'self' https://neon-pulse-chat.netlify.app https://*.netlify.app https://github.com https://*.github.com https://accounts.google.com https://*.googleapis.com https://*.google.com; media-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self' https://github.com https://*.github.com https://accounts.google.com https://*.google.com; frame-src 'self' https://github.com https://*.github.com https://accounts.google.com https://*.google.com; frame-ancestors 'none'; upgrade-insecure-requests;`
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

  // Nonce + hardening headers.
  const nonce = crypto.randomUUID();
  const csp = nonceSource(nonce);

  // Next.js 16 derives the nonce for its inline scripts/styles from the
  // Content-Security-Policy header it receives on THIS request, so the CSP
  // must be forwarded through the render request — not just echoed on the
  // response. Without this, hydration scripts lack the nonce attribute and
  // get blocked by the browser CSP (making every page non-interactive).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  if (csp) {
    requestHeaders.set("content-security-policy", csp);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (csp) {
    response.headers.set("Content-Security-Policy", csp);
  }
  response.headers.set("x-nonce", nonce);

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