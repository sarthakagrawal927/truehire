/**
 * Portable agent-edge handler (fleet GEO standard).
 * Spec: fleet-ops/docs/agent-indexing-standard.md
 */

export const AGENT_SURFACE = {
  name: 'TrueHire',
  url: 'https://truehire.rolepatch.com',
  llmsTxt:
    '# TrueHire\n' +
    '\n' +
    '> Hiring-side companion under RolePatch for evaluating candidates with structured role fit.\n' +
    '\n' +
    '## Product\n' +
    '\n' +
    '- [Home](https://truehire.rolepatch.com/): Product\n' +
    '- [RolePatch](https://rolepatch.com/): Parent product\n' +
    '\n' +
    '## Machine surfaces\n' +
    '\n' +
    '- [Agent catalog](https://truehire.rolepatch.com/api/ai): JSON inventory of public surfaces\n' +
    '- [Homepage markdown](https://truehire.rolepatch.com/index.md): Product brief without JS\n' +
    '- [This index](https://truehire.rolepatch.com/llms.txt)\n' +
    '\n' +
    '## Optional\n' +
    '\n' +
    '- [Foundry](https://sassmaker.com): Parent fleet showcase\n',
  indexMd:
    '# TrueHire\n' +
    '\n' +
    'Hiring companion related to RolePatch for structured candidate evaluation.\n' +
    '\n' +
    '## Agent entrypoints\n' +
    '\n' +
    '- https://truehire.rolepatch.com/llms.txt\n' +
    '- https://truehire.rolepatch.com/api/ai\n' +
    '- https://truehire.rolepatch.com/index.md\n',
  catalog: {
    name: 'TrueHire',
    version: '1',
    url: 'https://truehire.rolepatch.com',
    llms: 'https://truehire.rolepatch.com/llms.txt',
    llmsFull: null,
    sitemap: 'https://truehire.rolepatch.com/sitemap.xml',
    markdown: {
      suffix: '.md',
      negotiation: true,
    },
    surfaces: [
      {
        id: 'home',
        url: 'https://truehire.rolepatch.com/',
        md: 'https://truehire.rolepatch.com/index.md',
        kind: 'static',
        description: 'Product home',
      },
      {
        id: 'rolepatch',
        url: 'https://rolepatch.com/',
        md: null,
        kind: 'static',
        description: 'Parent product',
      },
    ],
    auth: {
      public: true,
      notes: 'Auth-walled app routes are not agent-indexed unless listed here.',
    },
  },
  llmsFull: null,
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
    if (AGENT_SURFACE.skipLlms) return null;
    return text(AGENT_SURFACE.llmsTxt, 'text/plain; charset=utf-8');
  }
  if (path === '/llms-full.txt' && AGENT_SURFACE.llmsFull) {
    return text(AGENT_SURFACE.llmsFull, 'text/plain; charset=utf-8');
  }
  if (path === '/index.md') {
    return text(AGENT_SURFACE.indexMd, 'text/markdown; charset=utf-8');
  }
  if (path === '/api/ai') {
    const catalog = {
      ...AGENT_SURFACE.catalog,
      url: url.origin,
      llms: `${url.origin}/llms.txt`,
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
