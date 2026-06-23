// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Mirrors fleet/linkchat/landing-astro/astro.config.mjs — the reference
// LCP-optimized Astro setup. Pure static output (no SSR adapter): the
// landing is fully static HTML. CSS is inlined into the HTML
// (`build.inlineStylesheets: 'always'`) so the LCP path is one round-
// trip: HTML → fonts → paint.
//
// Tailwind v4 runs via `@tailwindcss/vite` (matches the saas-maker
// docs pattern). The source-of-truth utility classes in
// `src/pages/index.astro` and `Layout.astro` are picked up by the
// Tailwind scanner without extra config.
//
// Lightning CSS replaces the default PostCSS pipeline as both
// transformer and minifier (fleet web-stack standard).
export default defineConfig({
  site: 'https://truehire.sarthakagrawal927.workers.dev',
  output: 'static',
  trailingSlash: 'never',
  // Emit `about.html` rather than `about/index.html` — no 308 redirect
  // on every link.
  build: {
    format: 'file',
    inlineStylesheets: 'always',
  },
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
    css: { transformer: 'lightningcss' },
    build: { cssMinify: 'lightningcss' },
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
      },
    },
  },
});
