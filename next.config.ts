import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the LAN address used during local development so Next.js dev
  // resources/HMR can be loaded from another device on the same network.
  allowedDevOrigins: ["192.168.1.3", "localhost"],
  // Keep Turbopack scoped to this app; a parent-level package-lock.json
  // can otherwise cause Next.js to infer the wrong workspace root.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
