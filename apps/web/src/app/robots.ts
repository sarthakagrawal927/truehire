import type { MetadataRoute } from 'next';
import { PRIVATE_ROUTE_PREFIXES, SITE_URL } from '../../public-routes.mjs';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/api/ai'],
        disallow: PRIVATE_ROUTE_PREFIXES,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
