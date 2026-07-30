import type { MetadataRoute } from 'next';
import { db, schema } from '@truehire/db';
import { desc, eq } from 'drizzle-orm';
import { PUBLIC_ROUTES, PUBLIC_TEMPLATES, SITE_URL } from '../../public-routes.mjs';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path === '/' ? '' : route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency as MetadataRoute.Sitemap[number]['changeFrequency'],
    priority: route.priority,
  }));

  let profileRoutes: MetadataRoute.Sitemap = [];
  try {
    const users = await db
      .select({
        githubUsername: schema.users.githubUsername,
        lastScoredAt: schema.users.lastScoredAt,
      })
      .from(schema.users)
      .where(eq(schema.users.claimed, true))
      .orderBy(desc(schema.users.createdAt))
      .limit(50_000);

    profileRoutes = users
      .filter((u) => u.githubUsername)
      .flatMap((u) => {
        const handle = u.githubUsername as string;
        const lastModified = u.lastScoredAt ? new Date(u.lastScoredAt) : now;
        return PUBLIC_TEMPLATES.map((template, index) => ({
          url: `${SITE_URL}${template.path.replace('{handle}', encodeURIComponent(handle))}`,
          lastModified,
          changeFrequency: 'weekly' as const,
          priority: [0.75, 0.5, 0.55][index],
        }));
      });
  } catch {
    /* DB offline */
  }

  return [...staticRoutes, ...profileRoutes];
}
