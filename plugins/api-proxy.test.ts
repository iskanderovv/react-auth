import { describe, expect, it } from 'vitest';
import { API_PATHS, apiProxy } from './api-proxy.ts';

const pattern = new RegExp(API_PATHS);

describe('API proxy paths', () => {
  it('sends every API route to the API, with or without a query string', () => {
    const apiRoutes = [
      '/auth/google',
      '/auth/facebook',
      '/auth/telegram',
      '/auth/google/callback?code=abc&state=xyz',
      '/auth/telegram/callback',
      '/auth/refresh',
      '/auth/logout',
      '/auth/link/facebook',
      '/me',
      '/docs',
      '/docs-json',
      '/health',
    ];
    for (const path of apiRoutes) {
      expect(pattern.test(path), path).toBe(true);
    }
  });

  it('keeps the pages the API redirects to for the web app', () => {
    for (const path of [
      '/auth/callback',
      '/auth/callback?error=access_denied',
      '/settings/accounts?linked=google',
      '/',
    ]) {
      expect(pattern.test(path), path).toBe(false);
    }
  });

  it('does not capture the app files or look-alike paths', () => {
    for (const path of [
      '/assets/index.js',
      '/robots.txt',
      '/icon-192.png',
      '/auth/',
      '/auth/github',
      '/me/other',
      '/docs/extra',
      '/healthz',
    ]) {
      expect(pattern.test(path), path).toBe(false);
    }
  });

  it('builds a Vite proxy entry for the given target', () => {
    expect(apiProxy('http://localhost:3000')).toEqual({ [API_PATHS]: { target: 'http://localhost:3000' } });
  });
});
