import type { MetadataRoute } from 'next';

const siteUrl = 'https://truehire.workers.dev';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/api/', '/verify/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
