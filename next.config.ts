import type { NextConfig } from "next";

// For GitHub Pages static export run with:
//   NEXT_OUTPUT=export NEXT_PUBLIC_BASE_PATH=/<repo-name> next build
const isExport = process.env.NEXT_OUTPUT === "export";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  ...(isExport ? { output: "export" as const, trailingSlash: false } : { output: "standalone" as const }),
  basePath,
  distDir: process.env.BUILD_DIST || ".next",
  images: { unoptimized: true },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
