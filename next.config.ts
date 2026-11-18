import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // az oldalak személyre szabottak (süti-alapú munkamenet), ezért nincs cacheComponents / partial prefetching
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
