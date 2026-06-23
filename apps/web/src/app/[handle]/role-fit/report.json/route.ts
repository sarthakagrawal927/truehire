import { NextResponse } from 'next/server';
import {
  buildRoleFitReport,
  serializePublicRoleFitReport,
  type EvidenceEntry,
  type ScoreBreakdown,
} from '@truehire/core';

import { getLatestScore, getUserByUsername } from '@/lib/score-service';

export const dynamic = 'force-dynamic';

/**
 * JSON twin of /[handle]/role-fit. Lets recruiter tooling — ATS plugins,
 * Slack bots, browser extensions — pull the verified-strength vs. gap
 * decomposition without scraping the HTML page.
 *
 * Pass the JD as ?jd=... (URL-encoded). Same query contract as the page.
 */
export async function GET(req: Request, ctx: { params: Promise<{ handle: string }> }) {
  const { handle } = await ctx.params;
  const clean = handle.startsWith('@') ? handle.slice(1) : handle;
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(clean)) {
    return NextResponse.json({ error: 'invalid_handle' }, { status: 400 });
  }

  const user = await getUserByUsername(clean);
  if (!user) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const score = await getLatestScore(user.id);
  if (!score) return NextResponse.json({ error: 'not_scored' }, { status: 404 });

  const url = new URL(req.url);
  const jd = url.searchParams.get('jd')?.trim() ?? '';
  if (!jd) {
    return NextResponse.json(
      {
        error: 'missing_jd',
        hint: 'Pass a job description as ?jd=...',
      },
      { status: 400 }
    );
  }

  const evidence: EvidenceEntry[] = JSON.parse(score.evidenceJson);
  const languages: ScoreBreakdown['languages'] = JSON.parse(score.languagesJson);
  const report = serializePublicRoleFitReport(
    buildRoleFitReport({
      jobDescription: jd,
      evidence,
      score: { languages },
    })
  );

  return NextResponse.json(
    {
      handle: clean,
      generatedAt: new Date().toISOString(),
      report,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    }
  );
}
