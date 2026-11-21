import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import { apiProxy, DEFAULT_API_TARGET } from './plugins/api-proxy.ts';
import { seo } from './plugins/seo.ts';

const DEV_SITE_URL = 'http://localhost:5173';

export default defineConfig(({ mode, command }) => {
  const siteUrl = loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL ?? DEV_SITE_URL;

  if (command === 'build' && mode === 'production' && !siteUrl.startsWith('https://')) {
    throw new Error('Set VITE_SITE_URL to the public https address of this app for a production build.');
  }

  const proxy = apiProxy(process.env.API_PROXY_TARGET ?? DEFAULT_API_TARGET);

  return {
    plugins: [react(), seo(siteUrl)],
    resolve: { alias: { '@': resolve(import.meta.dirname, 'src') } },
    server: { port: 5173, host: true, allowedHosts: true, proxy },
    preview: { port: 5173, host: true, allowedHosts: true, proxy },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      restoreMocks: true,
    },
  };
});
