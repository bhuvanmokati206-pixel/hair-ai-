import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 blocks cross-origin dev requests (the /_next chunks, HMR, fonts) by
  // default, which breaks the app when a phone or a second laptop loads it over
  // the LAN IP instead of localhost. These wildcards cover the common private
  // ranges so any device on the same Wi-Fi works without editing this each time
  // the router hands out a new IP. Dev-only — has no effect on a production build.
  allowedDevOrigins: ["192.168.*.*", "10.0.*.*", "172.16.*.*"],
};

export default nextConfig;
