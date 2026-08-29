/**
 * Portable agent-edge handler — copy or generate into each product.
 * Spec: fleet-ops/docs/agent-indexing-standard.md
 *
 * Usage in worker.mjs (before openNext.fetch):
 *   import { handleAgentEdge } from './agent-edge.mjs'
 *   const agent = handleAgentEdge(request)
 *   if (agent) return agent
 */

/** @type {{ name: string, url: string, llmsTxt: string, llmsFullTxt: string, indexMd: string, demoMd: string, catalog: object }} */
export const AGENT_SURFACE = {
  name: 'TrueHire',
  url: 'https://truehire.rolepatch.com',
  llmsFullTxt: `# TrueHire: full agent brief

TrueHire tested whether technical candidates could be ranked transparently from verified public GitHub evidence. Public activity was converted into explicit scoring factors and evidence-linked profiles.

The evidence-scoring MVP shipped, but trust and marketplace adoption remained unresolved. The standalone product is archived. There is no active marketplace, signup, or standalone roadmap, and RolePatch now carries active hiring-product work.

## Index

# TrueHire

TrueHire was an experiment in transparent candidate scoring from verified public GitHub evidence. The standalone product is archived, and RolePatch now carries the active hiring work.

## What it tested

- Audience: technical candidates and recruiters who wanted inspectable evidence behind a score.
- Method: public GitHub activity was converted into explicit scoring factors and evidence-linked profiles.
- Outcome: an evidence-scoring MVP shipped, but trust and marketplace adoption remained unresolved.
- Current state: there is no active marketplace, signup, or standalone roadmap.

## Inspect the archive

- [Archived homepage](https://truehire.rolepatch.com/)
- [Sample profile](https://truehire.rolepatch.com/demo) ([Markdown](https://truehire.rolepatch.com/demo.md))
- [Retained RolePatch proof](https://rolepatch.com/proof)

## Agent entrypoints

- https://truehire.rolepatch.com/llms.txt
- https://truehire.rolepatch.com/api/ai
- https://truehire.rolepatch.com/index.md

## Archive links

- Home: https://truehire.rolepatch.com/ - Scoring thesis, sample evidence, and limitations
- Sample: https://truehire.rolepatch.com/demo - Static profile demonstration
- RolePatch: https://rolepatch.com/proof - Retained proof in the active product

## Machine surfaces

- https://truehire.rolepatch.com/llms.txt
- https://truehire.rolepatch.com/llms-full.txt
- https://truehire.rolepatch.com/api/ai
- https://truehire.rolepatch.com/index.md
- https://truehire.rolepatch.com/demo.md
- https://truehire.rolepatch.com/sitemap.xml
- https://truehire.rolepatch.com/robots.txt

## Contact / fleet

- Fleet: https://sassmaker.com
- Agent email for directory verification: sarthakagrawal@agentmail.to
`,
  llmsTxt: `# TrueHire

> Archived research into transparent candidate scoring from verified public GitHub evidence.

## Archive

- [Home](https://truehire.rolepatch.com/): Scoring thesis, sample evidence, and limitations
- [Sample profile](https://truehire.rolepatch.com/demo): Static demonstration of the scoring model ([Markdown](https://truehire.rolepatch.com/demo.md))
- [RolePatch proof](https://rolepatch.com/proof): Active hiring-product work that superseded TrueHire

TrueHire is not an active marketplace. It has no signup or standalone roadmap.

## Machine surfaces

- [Agent catalog](https://truehire.rolepatch.com/api/ai): JSON inventory of public surfaces
- [Homepage markdown](https://truehire.rolepatch.com/index.md): Product brief without JS
- [This index](https://truehire.rolepatch.com/llms.txt)

## Optional

- [Foundry](https://sassmaker.com): Parent fleet showcase
`,
  indexMd: `# TrueHire

TrueHire was an experiment in transparent candidate scoring from verified public GitHub evidence. The standalone product is archived, and RolePatch now carries the active hiring work.

## What it tested

- Audience: technical candidates and recruiters who wanted inspectable evidence behind a score.
- Method: public GitHub activity was converted into explicit scoring factors and evidence-linked profiles.
- Outcome: an evidence-scoring MVP shipped, but trust and marketplace adoption remained unresolved.
- Current state: there is no active marketplace, signup, or standalone roadmap.

## Inspect the archive

- [Archived homepage](https://truehire.rolepatch.com/)
- [Sample profile](https://truehire.rolepatch.com/demo) ([Markdown](https://truehire.rolepatch.com/demo.md))
- [Retained RolePatch proof](https://rolepatch.com/proof)

## Agent entrypoints

- https://truehire.rolepatch.com/llms.txt
- https://truehire.rolepatch.com/api/ai
- https://truehire.rolepatch.com/index.md
`,
  demoMd: `# TrueHire sample profile

This preserved demonstration shows how the TrueHire MVP presented a candidate score derived from public GitHub evidence.

The sample includes:

- a transparent 0-100 composite score;
- separate depth, breadth, recognition, craft, and specialization factors;
- source repositories and contribution evidence behind the score;
- an activity history and language breakdown.

The profile and its data are illustrative. TrueHire is archived, so the sample does not offer profile claiming or recruiter signup.

- [Open the visual sample](https://truehire.rolepatch.com/demo)
- [Read the archived product brief](https://truehire.rolepatch.com/index.md)
- [View retained proof in RolePatch](https://rolepatch.com/proof)
`,
  catalog: {
    name: 'TrueHire',
    version: '1',
    url: 'https://truehire.rolepatch.com',
    llms: 'https://truehire.rolepatch.com/llms.txt',
    llmsFull: 'https://truehire.rolepatch.com/llms-full.txt',
    sitemap: 'https://truehire.rolepatch.com/sitemap.xml',
    robots: 'https://truehire.rolepatch.com/robots.txt',
    markdown: { suffix: '.md', negotiation: true },
    surfaces: [
      {
        id: 'home',
        url: 'https://truehire.rolepatch.com/',
        md: 'https://truehire.rolepatch.com/index.md',
        kind: 'static',
        description: 'Archived scoring thesis, sample evidence, and limitations',
      },
      {
        id: 'sample',
        url: 'https://truehire.rolepatch.com/demo',
        md: 'https://truehire.rolepatch.com/demo.md',
        kind: 'static',
        description: 'Illustrative profile showing the score factors and source evidence',
      },
    ],
    auth: {
      public: true,
      notes: 'The archive is public. There is no active signup, marketplace, or standalone roadmap.',
    },
  },
};

/**
 * @param {Request} request
 * @returns {Response | null}
 */
export function handleAgentEdge(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const url = new URL(request.url);
  const path = url.pathname === '' ? '/' : url.pathname;

  if (path === '/llms.txt') {
    return text(AGENT_SURFACE.llmsTxt, 'text/plain; charset=utf-8');
  }
  if (path === '/llms-full.txt' && AGENT_SURFACE.llmsFullTxt) {
    return text(AGENT_SURFACE.llmsFullTxt, 'text/plain; charset=utf-8');
  }
  if (path === '/index.md') {
    return text(AGENT_SURFACE.indexMd, 'text/markdown; charset=utf-8');
  }
  if (path === '/demo.md') {
    return text(AGENT_SURFACE.demoMd, 'text/markdown; charset=utf-8');
  }
  if (path === '/robots.txt') {
    return text(
      `User-agent: *\nAllow: /\n\nSitemap: ${url.origin}/sitemap.xml\n\n# Agent indexing\nAllow: /llms.txt\nAllow: /llms-full.txt\nAllow: /index.md\nAllow: /demo.md\nAllow: /api/ai\n`,
      'text/plain; charset=utf-8'
    );
  }
  if (path === '/sitemap.xml') {
    return text(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${url.origin}/</loc></url>\n  <url><loc>${url.origin}/demo</loc></url>\n</urlset>\n`,
      'application/xml; charset=utf-8'
    );
  }
  if (path === '/api/ai') {
    // Re-bind origin so preview/custom domains stay correct
    const catalog = {
      ...AGENT_SURFACE.catalog,
      url: url.origin,
      llms: `${url.origin}/llms.txt`,
      llmsFull: `${url.origin}/llms-full.txt`,
      sitemap: AGENT_SURFACE.catalog.sitemap
        ? String(AGENT_SURFACE.catalog.sitemap).replace(AGENT_SURFACE.url, url.origin)
        : `${url.origin}/sitemap.xml`,
      surfaces: (AGENT_SURFACE.catalog.surfaces || []).map((s) => ({
        ...s,
        url: s.url ? String(s.url).replace(AGENT_SURFACE.url, url.origin) : s.url,
        md: s.md ? String(s.md).replace(AGENT_SURFACE.url, url.origin) : s.md,
      })),
    };
    return json(catalog);
  }

  // Homepage markdown negotiation
  if ((path === '/' || path === '') && wantsMarkdown(request)) {
    return text(AGENT_SURFACE.indexMd, 'text/markdown; charset=utf-8', {
      Link: '</index.md>; rel="alternate"; type="text/markdown"',
      Vary: 'Accept',
    });
  }

  return null;
}

function wantsMarkdown(request) {
  const accept = (request.headers.get('accept') || '').toLowerCase();
  if (!accept.includes('text/markdown')) return false;
  if (!accept.includes('text/html')) return true;
  return accept.indexOf('text/markdown') < accept.indexOf('text/html');
}

function text(body, type, extra = {}) {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=300',
      ...extra,
    },
  });
}

function json(data) {
  return new Response(`${JSON.stringify(data, null, 2)}\n`, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
