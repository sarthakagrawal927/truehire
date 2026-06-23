import type { NextConfig } from 'next';

// Only hydrate Cloudflare bindings during local `next dev`. Skipped in CI
// CI and when producing the CF worker bundle (opennext runs its own build).
if (
  process.env.NODE_ENV !== 'production' &&
  !process.env.VERCEL &&
  !process.env.CF_PAGES &&
  !process.env.OPEN_NEXT_BUILD
) {
  // Dynamic import so the adapter code stays out of normal Next.js builds.
  import('@opennextjs/cloudflare').then((m) => m.initOpenNextCloudflareForDev()).catch(() => {});
}

const nextConfig: NextConfig = {
  output: 'standalone',
  devIndicators: false,
  typedRoutes: false,
  images: {
    unoptimized: true,
    remotePatterns: [{ protocol: 'https', hostname: 'avatars.githubusercontent.com' }],
  },
  serverExternalPackages: [
    '@libsql/client',
    '@libsql/hrana-client',
    '@libsql/isomorphic-ws',
    'drizzle-orm',
  ],
  async headers() {
    return [
      {
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/:handle((?!api|dashboard|login|recruiter|verify|_next).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=3600',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
