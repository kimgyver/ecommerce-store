import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      }
    ],
    unoptimized: process.env.NODE_ENV === "development"
  }
};

export default nextConfig;
