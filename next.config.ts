import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 blocks cross-origin dev requests (the /_next chunks, HMR, fonts) by
  // default, which breaks the app when a phone or a second laptop loads it over
  // the LAN IP instead of localhost. Without this, the page LOOKS fine (the HTML
  // renders) but every click silently does nothing — the JS bundle that attaches
  // event handlers gets blocked as a disallowed cross-origin dev resource.
  // "10.0.*.*" alone missed a phone hotspot's 10.215.x.x range, so this covers
  // the whole 10.0.0.0/8 block plus common Android/iPhone hotspot defaults.
  // Dev-only — has no effect on a production build.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.16.*.*", "172.20.10.*", "*.loca.lt"],

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
