/** @type {import('next').NextConfig} */

const nextConfig = {
  async headers() {
    const headers = [
      // Sniffing / MIME confusion
      { key: "X-Content-Type-Options", value: "nosniff" },
      // Leakage of the referring URL
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // Clickjacking (also enforced via CSP frame-ancestors in middleware)
      { key: "X-Frame-Options", value: "DENY" },
      // Restrict browser features to what this app needs
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=()",
      },
    ];

    if (process.env.NODE_ENV === "production") {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      });
    }

    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;