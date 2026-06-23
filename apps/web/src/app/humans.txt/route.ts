export const dynamic = 'force-static';

const BODY = `/* TEAM */
Maintainer: Sarthak Agrawal
GitHub: sarthakagrawal927
Site: https://truehire.workers.dev

/* THANKS */
GitHub — for the public API that makes the score possible.

/* SITE */
Last updated: 2026-05-15
Standards: HTML5, CSS3 (Tailwind), TypeScript, RFC 9116 (security.txt)
Software: Next.js, React, Drizzle ORM, Turso, Cloudflare Workers
`;

export function GET() {
  return new Response(BODY, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
