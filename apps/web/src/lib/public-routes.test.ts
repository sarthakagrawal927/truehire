import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AGENT_SURFACE, handleAgentEdge } from '../../agent-edge.mjs';
import {
  PRIVATE_ROUTE_PREFIXES,
  PUBLIC_ROUTES,
  PUBLIC_TEMPLATES,
  markdownPathForRoute,
} from '../../public-routes.mjs';

const appRoot = resolve(import.meta.dirname, '..', 'app');

describe('public route registry', () => {
  it('accounts for every public static page once', () => {
    expect(PUBLIC_ROUTES).toHaveLength(14);
    expect(new Set(PUBLIC_ROUTES.map((route) => route.id)).size).toBe(PUBLIC_ROUTES.length);
    expect(new Set(PUBLIC_ROUTES.map((route) => route.path)).size).toBe(PUBLIC_ROUTES.length);

    for (const route of PUBLIC_ROUTES) {
      const pagePath =
        route.path === '/'
          ? resolve(appRoot, 'page.tsx')
          : resolve(appRoot, `.${route.path}/page.tsx`);
      expect(existsSync(pagePath), `${route.path} should have a page`).toBe(true);
      expect(
        route.markdown.length,
        `${route.path} should have substantive Markdown`
      ).toBeGreaterThan(180);
      expect(PRIVATE_ROUTE_PREFIXES.some((prefix) => route.path.startsWith(prefix))).toBe(false);
    }
  });

  it('accounts for all public profile templates', () => {
    expect(PUBLIC_TEMPLATES.map((template) => template.path)).toEqual([
      '/@{handle}',
      '/@{handle}/history',
      '/@{handle}/role-fit',
    ]);
  });

  it('keeps the sitemap implementation registry-driven and HTML-only', () => {
    const sitemapSource = readFileSync(resolve(appRoot, 'sitemap.ts'), 'utf8');
    expect(sitemapSource).toContain('PUBLIC_ROUTES.map');
    expect(sitemapSource).toContain('PUBLIC_TEMPLATES.map');
    expect(sitemapSource).not.toContain('/login');
    expect(sitemapSource).not.toContain('/llms.txt');
    expect(sitemapSource).not.toContain('/index.md');
  });

  it('keeps the agent catalog crawlable while excluding other APIs', () => {
    const robotsSource = readFileSync(resolve(appRoot, 'robots.ts'), 'utf8');
    expect(robotsSource).toContain("allow: ['/', '/api/ai']");
    expect(PRIVATE_ROUTE_PREFIXES).toContain('/api/');
  });
});

describe('agent-readable route coverage', () => {
  it.each(PUBLIC_ROUTES)('serves Markdown for $path', async (route) => {
    const pathname = markdownPathForRoute(route.path);
    const response = handleAgentEdge(new Request(`https://example.com${pathname}`));
    expect(response?.status).toBe(200);
    expect(response?.headers.get('content-type')).toContain('text/markdown');
    expect(await response?.text()).toBe(route.markdown);
  });

  it('negotiates Markdown for static and profile routes', async () => {
    for (const pathname of [
      '/methodology',
      '/@octocat',
      '/@octocat/history',
      '/@octocat/role-fit',
    ]) {
      const response = handleAgentEdge(
        new Request(`https://example.com${pathname}`, {
          headers: { Accept: 'text/markdown, text/html;q=0.8' },
        })
      );
      expect(response?.status, pathname).toBe(200);
      expect(response?.headers.get('vary'), pathname).toBe('Accept');
      expect((await response?.text())?.length, pathname).toBeGreaterThan(180);
    }
  });

  it('publishes the full route and template inventory in /api/ai', async () => {
    const response = handleAgentEdge(new Request('https://preview.example/api/ai'));
    const catalog = await response?.json();
    expect(catalog.surfaces).toHaveLength(PUBLIC_ROUTES.length);
    expect(catalog.templates).toHaveLength(PUBLIC_TEMPLATES.length);
    expect(
      catalog.surfaces.every((surface: { url: string }) =>
        surface.url.startsWith('https://preview.example')
      )
    ).toBe(true);
    expect(AGENT_SURFACE.llmsTxt).toContain('/recruiter/shortlist');
  });
});
