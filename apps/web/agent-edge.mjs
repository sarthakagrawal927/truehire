import {
  PUBLIC_ROUTES,
  PUBLIC_TEMPLATES,
  SITE_URL,
  markdownPathForRoute,
} from './public-routes.mjs';

const routeByPath = new Map(PUBLIC_ROUTES.map((route) => [route.path, route]));
const routeByMarkdownPath = new Map(
  PUBLIC_ROUTES.map((route) => [markdownPathForRoute(route.path), route])
);

export const AGENT_SURFACE = {
  name: 'TrueHire',
  url: SITE_URL,
  llmsTxt: buildLlmsIndex(),
  llmsFullTxt: buildFullBrief(),
  indexMd: routeByPath.get('/')?.markdown ?? '# TrueHire',
  catalog: buildCatalog(SITE_URL),
};

/**
 * Serve the public agent catalog, Markdown alternates, and Markdown content
 * negotiation before the OpenNext worker. All entries come from public-routes.mjs.
 *
 * @param {Request} request
 * @returns {Response | null}
 */
export function handleAgentEdge(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const url = new URL(request.url);
  const path = url.pathname || '/';

  if (path === '/llms.txt') return text(AGENT_SURFACE.llmsTxt, 'text/plain; charset=utf-8');
  if (path === '/llms-full.txt') {
    return text(AGENT_SURFACE.llmsFullTxt, 'text/plain; charset=utf-8');
  }
  if (path === '/api/ai') return json(buildCatalog(url.origin));

  const staticMarkdown = routeByMarkdownPath.get(path);
  if (staticMarkdown) {
    return text(staticMarkdown.markdown, 'text/markdown; charset=utf-8');
  }

  const dynamicMarkdown = matchDynamicMarkdown(path);
  if (dynamicMarkdown) {
    return text(dynamicMarkdown, 'text/markdown; charset=utf-8');
  }

  const staticRoute = routeByPath.get(path);
  if (staticRoute && wantsMarkdown(request)) {
    return negotiatedMarkdown(staticRoute.markdown, markdownPathForRoute(path));
  }

  const dynamicRoute = matchDynamicHtml(path);
  if (dynamicRoute && wantsMarkdown(request)) {
    return negotiatedMarkdown(dynamicRoute.markdown, dynamicRoute.markdownPath);
  }

  return null;
}

function buildCatalog(origin) {
  return {
    name: 'TrueHire',
    version: '2',
    url: origin,
    llms: `${origin}/llms.txt`,
    llmsFull: `${origin}/llms-full.txt`,
    sitemap: `${origin}/sitemap.xml`,
    robots: `${origin}/robots.txt`,
    markdown: { suffix: '.md', negotiation: true },
    surfaces: PUBLIC_ROUTES.map((route) => ({
      id: route.id,
      url: `${origin}${route.path === '/' ? '/' : route.path}`,
      md: `${origin}${markdownPathForRoute(route.path)}`,
      kind: 'static',
      description: route.description,
    })),
    templates: PUBLIC_TEMPLATES.map((template) => ({
      ...template,
      urlTemplate: `${origin}${template.path}`,
      markdownTemplate: `${origin}${template.markdownPath}`,
    })),
    dataResources: [
      {
        path: '/@{handle}/data.json',
        description: 'Portable public profile and score snapshot.',
      },
      {
        path: '/@{handle}/repos.csv',
        description: 'Public repository evidence as CSV.',
      },
      {
        path: '/@{handle}/badge.svg',
        description: 'Embeddable public score badge.',
      },
      {
        path: '/@{handle}/role-fit/report.json?jd={jobDescription}',
        description: 'Public evidence-based role-fit report.',
      },
    ],
    auth: {
      public: true,
      notes: 'Only listed public routes and templates are agent-indexed.',
    },
  };
}

function buildLlmsIndex() {
  const links = PUBLIC_ROUTES.map(
    (route) =>
      `- [${route.title}](${SITE_URL}${route.path === '/' ? '/' : route.path}): ${route.description}`
  ).join('\n');
  return `# TrueHire

> Transparent engineering-candidate evidence derived from public GitHub work.

## Public product surfaces

${links}

## Machine surfaces

- [Agent catalog](${SITE_URL}/api/ai): JSON inventory of public routes, templates, and resources.
- [Full agent brief](${SITE_URL}/llms-full.txt): Combined Markdown coverage.
- [Sitemap](${SITE_URL}/sitemap.xml): Public HTML pages only.
`;
}

function buildFullBrief() {
  return `${PUBLIC_ROUTES.map((route) => route.markdown).join('\n\n---\n\n')}

---

# Public profile templates

${PUBLIC_TEMPLATES.map((template) => `- \`${template.path}\`: ${template.description}`).join('\n')}
`;
}

function matchDynamicMarkdown(path) {
  const match = path.match(/^\/@([A-Za-z0-9-]{1,39})(\/history|\/role-fit)?\.md$/);
  if (!match) return null;
  return dynamicTemplateMarkdown(match[1], match[2] ?? '');
}

function matchDynamicHtml(path) {
  const match = path.match(/^\/@([A-Za-z0-9-]{1,39})(\/history|\/role-fit)?$/);
  if (!match) return null;
  const suffix = match[2] ?? '';
  return {
    markdown: dynamicTemplateMarkdown(match[1], suffix),
    markdownPath: `/@${match[1]}${suffix}.md`,
  };
}

function dynamicTemplateMarkdown(handle, suffix) {
  const profile = `/@${handle}`;
  if (suffix === '/history') {
    return `# @${handle} score history

This public TrueHire view contains historical score snapshots for @${handle}, ordered by recomputation date. It shows how the overall score and its evidence-derived dimensions changed over time.

Open the [live score history](${profile}/history) or return to the [public profile](${profile}).`;
  }
  if (suffix === '/role-fit') {
    return `# @${handle} role-fit report

This TrueHire view compares @${handle}'s public GitHub evidence with requirements extracted from a supplied job description. Verified strengths, evidence gaps, and limitations remain visible; a missing public signal is not proof that the candidate lacks a skill.

Open the [role-fit view](${profile}/role-fit) or inspect the [portable profile data](${profile}/data.json).`;
  }
  return `# @${handle} on TrueHire

This public profile presents @${handle}'s latest TrueHire score with repository evidence, activity, language mix, work-history verification where available, and explicit data limitations.

- [Open the live profile](${profile})
- [Inspect score history](${profile}/history)
- [View portable profile data](${profile}/data.json)
- [Review the scoring methodology](/methodology)

TrueHire scores public evidence only. The profile is a review aid, not a hiring decision.`;
}

function wantsMarkdown(request) {
  const accept = (request.headers.get('accept') || '').toLowerCase();
  if (!accept.includes('text/markdown')) return false;
  if (!accept.includes('text/html')) return true;
  return accept.indexOf('text/markdown') < accept.indexOf('text/html');
}

function negotiatedMarkdown(body, markdownPath) {
  return text(body, 'text/markdown; charset=utf-8', {
    Link: `<${markdownPath}>; rel="alternate"; type="text/markdown"`,
    Vary: 'Accept',
  });
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
