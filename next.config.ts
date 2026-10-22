import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// In development, do NOT use upgrade-insecure-requests (local LAN testing uses http://),
// and include 'unsafe-eval' plus ws:/wss: so Next.js fast-refresh and dev client work.
const cspHeader = isDev
  ? "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; connect-src 'self' https: ws: wss:; font-src 'self' data: https:; media-src 'self' blob: data:;"
  : "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://verify.msg91.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https:; font-src 'self' data:; media-src 'self' blob: data:; upgrade-insecure-requests";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: cspHeader },
        ],
      },
    ];
  },
  // Next 16 blocks cross-origin dev requests (the /_next chunks, HMR, fonts) by
  // default, which breaks the app when a phone or a second laptop loads it over
  // the LAN IP instead of localhost.
  allowedDevOrigins: [
    "localhost",
    "localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3000",
    "192.168.0.5",
    "192.168.0.5:3000",
    "192.168.0.16",
    "192.168.0.16:3000",
    "192.168.*.*",
    "10.*.*.*",
    "172.16.*.*",
    "172.20.10.*",
    "*.loca.lt",
  ],

  // Full-resolution scans send four large images in one request. Next.js
  // truncates request bodies over 10MB by default (in the proxy/middleware
  // layer), which cut the analysis JSON off mid-string and made it fall back to
  // the demo/mock. Raised so full-res photos come through intact. This app uses
  // proxy.ts (Next 16's renamed middleware), so proxyClientMaxBodySize is the one
  // that matters; middlewareClientMaxBodySize is set too for safety. Local runs
  // have no other cap; the Vercel serverless 4.5MB limit still applies there.
  experimental: {
    proxyClientMaxBodySize: "50mb",
  },
};

export default nextConfig;
