import type { Plugin } from 'vite';

const PLACEHOLDER = '%SITE_URL%';

export const HIDDEN_PATHS = ['/auth/', '/settings/'];

export function robots(origin: string): string {
  return [
    'User-agent: *',
    ...HIDDEN_PATHS.map((path) => `Disallow: ${path}`),
    'Allow: /',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
}

export function sitemap(origin: string, now: Date = new Date()): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>',
    `    <loc>${origin}/</loc>`,
    `    <lastmod>${now.toISOString().slice(0, 10)}</lastmod>`,
    '  </url>',
    '</urlset>',
    '',
  ].join('\n');
}

export function normalizeOrigin(value: string): string {
  return value.replace(/\/+$/, '');
}

export function seo(siteUrl: string): Plugin {
  const origin = normalizeOrigin(siteUrl);

  return {
    name: 'seo',
    transformIndexHtml: (html) => html.replaceAll(PLACEHOLDER, origin),
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots(origin) });
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap(origin) });
    },
  };
}
