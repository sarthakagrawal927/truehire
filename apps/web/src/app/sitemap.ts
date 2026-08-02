import type { MetadataRoute } from 'next';
import { db, schema } from '@truehire/db';
import { desc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

const siteUrl = 'https://truehire.rolepatch.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/stats`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/methodology`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/recent`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${siteUrl}/compare`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${siteUrl}/suggest`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${siteUrl}/demo`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    {
      url: `${siteUrl}/recruiter/shortlist/demo`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.55,
    },
    {
      url: `${siteUrl}/recruiter/resume-audit/demo`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.55,
    },
    { url: `${siteUrl}/login`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteUrl}/llms.txt`, lastModified: now, changeFrequency: 'weekly', priority: 0.4 },
    { url: `${siteUrl}/index.md`, lastModified: now, changeFrequency: 'weekly', priority: 0.4 },
  ];

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
        const base = `${siteUrl}/${encodeURIComponent(handle)}`;
        return [
          {
            url: base,
            lastModified,
            changeFrequency: 'weekly' as const,
            priority: 0.75,
          },
          {
            url: `${base}/history`,
            lastModified,
            changeFrequency: 'weekly' as const,
            priority: 0.5,
          },
          {
            url: `${base}/role-fit`,
            lastModified,
            changeFrequency: 'weekly' as const,
            priority: 0.55,
          },
        ];
      });
  } catch {
    /* DB offline */
  }

  return [...staticRoutes, ...profileRoutes];
}
