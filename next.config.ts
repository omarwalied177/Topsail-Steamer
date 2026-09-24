import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the LAN address used during local development so Next.js dev
  // resources/HMR can be loaded from another device on the same network.
  allowedDevOrigins: ["192.168.1.3", "localhost"],
};

export default nextConfig;
