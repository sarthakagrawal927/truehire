import { getLatestScore, getUserByUsername } from '@/lib/score-service';

export const dynamic = 'force-dynamic';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function bandFill(score: number): { bg: string; ring: string; label: string } {
  if (score >= 80) return { bg: '#022c22', ring: '#10b981', label: 'exceptional' };
  if (score >= 60) return { bg: '#1e3a8a', ring: '#3b82f6', label: 'strong' };
  if (score >= 40) return { bg: '#374151', ring: '#9ca3af', label: 'developing' };
  return { bg: '#1f2937', ring: '#6b7280', label: 'emerging' };
}

/**
 * /@handle/badge.svg — embeddable shield-style SVG showing a profile's
 * current overall TrueHire score. Suitable for README badges and HTML
 * <img> embeds. 30s edge cache so it stays snappy without being stale.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ handle: string }> }) {
  const { handle: raw } = await ctx.params;
  const handle = raw.startsWith('@') ? raw.slice(1) : raw;
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(handle)) {
    return new Response('invalid handle', { status: 400 });
  }

  const user = await getUserByUsername(handle);
  const score = user ? await getLatestScore(user.id) : null;

  const W = 200;
  const H = 56;
  const display = score?.overall ?? null;
  const palette =
    display != null ? bandFill(display) : { bg: '#1f2937', ring: '#4b5563', label: 'no score' };

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="TrueHire score for ${escapeXml(handle)}: ${display ?? 'unscored'}">
  <title>TrueHire score for @${escapeXml(handle)}</title>
  <rect x="0" y="0" width="${W}" height="${H}" rx="8" ry="8" fill="${palette.bg}" />
  <rect x="0" y="0" width="${W}" height="${H}" rx="8" ry="8" fill="none" stroke="${palette.ring}" stroke-width="1.5" />
  <text x="14" y="22" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI" font-size="11" font-weight="600" letter-spacing="0.12em" fill="#e5e7eb">TRUEHIRE</text>
  <text x="14" y="40" font-family="ui-sans-serif, system-ui" font-size="13" font-weight="500" fill="#f9fafb">@${escapeXml(handle)}</text>
  <text x="${W - 14}" y="22" text-anchor="end" font-family="ui-sans-serif, system-ui" font-size="10" font-weight="600" letter-spacing="0.08em" fill="${palette.ring}">${escapeXml(palette.label.toUpperCase())}</text>
  <text x="${W - 14}" y="44" text-anchor="end" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="22" font-weight="700" fill="#fafaf9">${display ?? '—'}</text>
</svg>
`;

  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300',
    },
  });
}
