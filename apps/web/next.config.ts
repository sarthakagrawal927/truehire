import type { NextConfig } from "next";

// Only hydrate Cloudflare bindings during local `next dev`. Skipped in Vercel
// CI and when producing the CF worker bundle (opennext runs its own build).
if (
  process.env.NODE_ENV !== "production" &&
  !process.env.VERCEL &&
  !process.env.CF_PAGES &&
  !process.env.OPEN_NEXT_BUILD
) {
  // Dynamic import so the adapter code never enters the Vercel bundle at all.
  import("@opennextjs/cloudflare")
    .then((m) => m.initOpenNextCloudflareForDev())
    .catch(() => {});
}

const nextConfig: NextConfig = {
  devIndicators: false,
  typedRoutes: false,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  serverExternalPackages: [
    '@libsql/client',
    '@libsql/hrana-client',
    '@libsql/isomorphic-ws',
    'drizzle-orm',
  ],
};

export default nextConfig;
