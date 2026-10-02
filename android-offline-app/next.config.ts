import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.ANDROID_BUILD === "true" ? "export" : undefined,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
