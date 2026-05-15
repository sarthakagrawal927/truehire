import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const siteUrl = "https://truehire.workers.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: siteUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/stats`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/methodology`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
