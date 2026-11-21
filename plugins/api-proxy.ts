import type { ProxyOptions } from 'vite';

export const API_PATHS =
  '^/(auth/(google|facebook|telegram)(/callback)?|auth/(refresh|logout)|auth/link/[a-z]+|me|docs(-json)?|health)(\\?.*)?$';

export const DEFAULT_API_TARGET = 'http://localhost:3000';

export function apiProxy(target: string): Record<string, ProxyOptions> {
  return { [API_PATHS]: { target } };
}
