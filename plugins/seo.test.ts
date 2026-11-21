import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import config from '../vite.config.ts';
import { HIDDEN_PATHS, normalizeOrigin, robots, seo, sitemap } from './seo.ts';

const root = resolve(import.meta.dirname, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const publicFile = (href: string) => resolve(root, 'public', href.replace(/^\//, ''));

const html = read('index.html');
const doc = new DOMParser().parseFromString(html, 'text/html');

function meta(selector: string): string {
  const element = doc.querySelector(selector);
  expect(element, selector).not.toBeNull();
  return element!.getAttribute('content') ?? '';
}

function pngSize(path: string): string {
  const bytes = readFileSync(path);
  return `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`;
}

describe('index.html', () => {
  it('has a language, a viewport and one title of a sensible length', () => {
    expect(doc.documentElement.lang).toBe('en');
    expect(doc.querySelectorAll('title')).toHaveLength(1);
    expect(doc.title.length).toBeGreaterThanOrEqual(10);
    expect(doc.title.length).toBeLessThanOrEqual(60);
    expect(doc.title).toContain('Alifco');
    expect(meta('meta[name="viewport"]')).toContain('width=device-width');
  });

  it('has a description that fits a search result', () => {
    const description = meta('meta[name="description"]');
    expect(description.length).toBeGreaterThanOrEqual(70);
    expect(description.length).toBeLessThanOrEqual(160);
  });

  it('allows indexing and has exactly one canonical address on the public origin', () => {
    expect(meta('meta[name="robots"]')).toContain('index');
    expect(meta('meta[name="robots"]')).not.toContain('noindex');
    const canonical = doc.querySelectorAll('link[rel="canonical"]');
    expect(canonical).toHaveLength(1);
    expect(canonical[0].getAttribute('href')).toBe('%SITE_URL%/');
  });

  it('has no duplicated meta tags', () => {
    const keys = [...doc.querySelectorAll('meta[name], meta[property]')].map(
      (tag) => tag.getAttribute('name') ?? tag.getAttribute('property'),
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('has complete Open Graph tags with an absolute image of the recommended size', () => {
    for (const property of ['type', 'site_name', 'title', 'description', 'url', 'image', 'image:alt']) {
      expect(meta(`meta[property="og:${property}"]`).length, property).toBeGreaterThan(0);
    }
    expect(meta('meta[property="og:url"]')).toBe('%SITE_URL%/');
    const image = meta('meta[property="og:image"]');
    expect(image.startsWith('%SITE_URL%/')).toBe(true);
    const file = publicFile(image.replace('%SITE_URL%', ''));
    expect(existsSync(file)).toBe(true);
    expect(pngSize(file)).toBe('1200x630');
    expect(meta('meta[property="og:image:width"]')).toBe('1200');
    expect(meta('meta[property="og:image:height"]')).toBe('630');
  });

  it('has Twitter card tags that match the Open Graph ones', () => {
    expect(meta('meta[name="twitter:card"]')).toBe('summary_large_image');
    expect(meta('meta[name="twitter:title"]')).toBe(meta('meta[property="og:title"]'));
    expect(meta('meta[name="twitter:description"]')).toBe(meta('meta[property="og:description"]'));
    expect(meta('meta[name="twitter:image"]')).toBe(meta('meta[property="og:image"]'));
    expect(meta('meta[name="twitter:image:alt"]').length).toBeGreaterThan(0);
  });

  it('points every icon at a file that exists and declares its true size', () => {
    const icons = [...doc.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]')];
    expect(icons.length).toBeGreaterThanOrEqual(3);
    for (const icon of icons) {
      const file = publicFile(icon.getAttribute('href')!);
      expect(existsSync(file), file).toBe(true);
      expect(pngSize(file)).toBe(icon.getAttribute('sizes'));
    }
  });

  it('preloads the logo that the first screen shows', () => {
    const preload = doc.querySelector('link[rel="preload"][as="image"]');
    expect(preload).not.toBeNull();
    expect(existsSync(publicFile(preload!.getAttribute('href')!))).toBe(true);
  });

  it('describes the site with valid structured data', () => {
    const script = doc.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const data = JSON.parse(script!.textContent!.replaceAll('%SITE_URL%', 'https://app.example.com'));
    expect(data['@context']).toBe('https://schema.org');
    expect(data['@type']).toBe('WebSite');
    expect(data.url).toBe('https://app.example.com/');
    expect(data.name).toBe('Alifco');
  });

  it('says something useful when JavaScript is off', () => {
    const noscript = doc.querySelector('noscript');
    expect(noscript).not.toBeNull();
    expect(noscript!.textContent).toContain('JavaScript');
  });
});

describe('web manifest', () => {
  const href = doc.querySelector('link[rel="manifest"]')?.getAttribute('href') ?? '';
  const manifest = JSON.parse(readFileSync(publicFile(href), 'utf8'));

  it('names the app and starts at the root', () => {
    expect(manifest.name).toBe('Alifco');
    expect(manifest.short_name.length).toBeLessThanOrEqual(12);
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
  });

  it('uses the same colour as the page', () => {
    expect(manifest.theme_color).toBe(meta('meta[name="theme-color"]'));
  });

  it('lists icons that exist with the size they declare, including 192 and 512', () => {
    const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
    for (const icon of manifest.icons) {
      expect(pngSize(publicFile(icon.src))).toBe(icon.sizes);
    }
  });
});

describe('seo plugin', () => {
  const plugin = seo('https://app.example.com/');
  const transform = plugin.transformIndexHtml as (html: string) => string;

  it('puts the public address into every placeholder', () => {
    const result = transform(html);
    expect(result).not.toContain('%SITE_URL%');
    expect(result).toContain('<link rel="canonical" href="https://app.example.com/" />');
    expect(result).toContain('content="https://app.example.com/og-image.png"');
    expect(result).not.toContain('com//');
  });

  it('emits robots.txt and sitemap.xml with the build', () => {
    const emitFile = vi.fn();
    (plugin.generateBundle as (this: unknown) => void).call({ emitFile });

    const files = emitFile.mock.calls.map(([file]) => file.fileName);
    expect(files).toEqual(['robots.txt', 'sitemap.xml']);
  });
});

describe('robots.txt', () => {
  const text = robots('https://app.example.com');

  it('hides the paths the API redirects to after a login and a link', () => {
    for (const path of ['/auth/callback', '/settings/accounts']) {
      expect(
        HIDDEN_PATHS.some((hidden) => path.startsWith(hidden)),
        path,
      ).toBe(true);
    }
    for (const hidden of HIDDEN_PATHS) {
      expect(text).toContain(`Disallow: ${hidden}`);
    }
  });

  it('keeps the sign in page open and names the sitemap with an absolute address', () => {
    expect(text).toContain('User-agent: *');
    expect(text).toContain('Allow: /');
    expect(text).toContain('Sitemap: https://app.example.com/sitemap.xml');
  });
});

describe('sitemap.xml', () => {
  const xml = sitemap('https://app.example.com', new Date('2026-11-21T10:00:00Z'));
  const parsed = new DOMParser().parseFromString(xml, 'application/xml');

  it('is well formed and lists only the public page', () => {
    expect(parsed.querySelector('parsererror')).toBeNull();
    const locations = [...parsed.querySelectorAll('url > loc')].map((loc) => loc.textContent);
    expect(locations).toEqual(['https://app.example.com/']);
    expect(parsed.querySelector('lastmod')?.textContent).toBe('2026-11-21');
  });
});

describe('normalizeOrigin', () => {
  it('drops trailing slashes', () => {
    expect(normalizeOrigin('https://app.example.com///')).toBe('https://app.example.com');
  });
});

describe('vite config', () => {
  type ConfigFn = (env: { mode: string; command: string }) => { plugins: unknown[] };
  const build = config as unknown as ConfigFn;

  afterEach(() => vi.unstubAllEnvs());

  it('refuses a production build without the public https address', () => {
    vi.stubEnv('VITE_SITE_URL', '');
    expect(() => build({ mode: 'production', command: 'build' })).toThrow(/VITE_SITE_URL/);
    vi.stubEnv('VITE_SITE_URL', 'http://app.example.com');
    expect(() => build({ mode: 'production', command: 'build' })).toThrow(/https/);
  });

  it('accepts a production build with an https address', () => {
    vi.stubEnv('VITE_SITE_URL', 'https://app.example.com');
    expect(() => build({ mode: 'production', command: 'build' })).not.toThrow();
  });

  it('lets a finished build be served without it', () => {
    vi.stubEnv('VITE_SITE_URL', '');
    expect(() => build({ mode: 'production', command: 'serve' })).not.toThrow();
  });

  it('works without it in development', () => {
    vi.stubEnv('VITE_SITE_URL', '');
    expect(() => build({ mode: 'development', command: 'serve' })).not.toThrow();
  });
});
