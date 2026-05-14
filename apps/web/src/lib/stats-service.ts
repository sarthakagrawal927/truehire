import { db } from "@truehire/db";
import { sql } from "drizzle-orm";

export interface FleetStats {
  totalProfiles: number;
  meanScore: number;
  medianScore: number;
  p25Score: number;
  p75Score: number;
  maxScore: number;
  topLanguages: { language: string; profiles: number }[];
  scoreBuckets: { bucket: string; count: number }[];
}

interface LatestScoreRow {
  user_id: string;
  overall: number;
  languages_json: string;
}

interface LanguageEntry {
  language: string;
  share: number;
}

/**
 * Aggregate the most recent score per user. Seed/unclaimed profiles are
 * included — they're already publicly visible at /@handle.
 */
export async function getFleetStats(): Promise<FleetStats> {
  const result = await db.run(sql`
    SELECT user_id, overall, languages_json
    FROM scores s1
    WHERE computed_at = (
      SELECT MAX(computed_at) FROM scores s2 WHERE s2.user_id = s1.user_id
    )
  `);

  const rows = (result.rows ?? []) as unknown as LatestScoreRow[];
  const totalProfiles = rows.length;
  if (totalProfiles === 0) {
    return {
      totalProfiles: 0,
      meanScore: 0,
      medianScore: 0,
      p25Score: 0,
      p75Score: 0,
      maxScore: 0,
      topLanguages: [],
      scoreBuckets: [],
    };
  }

  const overalls = rows.map((r) => r.overall).sort((a, b) => a - b);
  const sum = overalls.reduce((s, v) => s + v, 0);
  const pick = (p: number) =>
    overalls[Math.min(overalls.length - 1, Math.floor(p * overalls.length))];

  const langCounts = new Map<string, number>();
  for (const row of rows) {
    let parsed: LanguageEntry[] = [];
    try {
      parsed = JSON.parse(row.languages_json ?? "[]");
    } catch {
      parsed = [];
    }
    // Count a language as "used by this profile" if it carries any share —
    // this avoids double-counting deeply polyglot profiles that have many
    // tiny shares.
    const seen = new Set<string>();
    for (const entry of parsed) {
      if (!entry?.language || seen.has(entry.language)) continue;
      seen.add(entry.language);
      langCounts.set(entry.language, (langCounts.get(entry.language) ?? 0) + 1);
    }
  }

  const topLanguages = [...langCounts.entries()]
    .map(([language, profiles]) => ({ language, profiles }))
    .sort((a, b) => b.profiles - a.profiles)
    .slice(0, 10);

  // 10-point buckets for distribution display.
  const buckets = new Map<string, number>();
  for (const v of overalls) {
    const low = Math.min(90, Math.floor(v / 10) * 10);
    const key = `${low}-${low + 9}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const scoreBuckets = [...buckets.entries()]
    .map(([bucket, count]) => ({ bucket, count }))
    .sort((a, b) => parseInt(a.bucket, 10) - parseInt(b.bucket, 10));

  return {
    totalProfiles,
    meanScore: Math.round(sum / totalProfiles),
    medianScore: pick(0.5),
    p25Score: pick(0.25),
    p75Score: pick(0.75),
    maxScore: overalls[overalls.length - 1],
    topLanguages,
    scoreBuckets,
  };
}
