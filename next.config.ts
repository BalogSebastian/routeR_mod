import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // az oldalak személyre szabottak (süti-alapú munkamenet), ezért nincs cacheComponents / partial prefetching
  async headers() {
    // a maplibre worker állandó fájl: ne kelljen minden betöltésnél újra-ellenőrizni (alapból max-age=0)
    return [{ source: "/maplibre-gl-:name.mjs", headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }] }];
  },
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
