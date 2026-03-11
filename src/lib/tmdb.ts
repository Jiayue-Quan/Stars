import { appEnv } from '@/lib/env';

type TmdbRequestOptions = RequestInit & {
  query?: Record<string, string | number | boolean | undefined>;
};

function buildTmdbUrl(path: string, query: TmdbRequestOptions['query'] = {}) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${appEnv.tmdbBaseUrl}${normalizedPath}`);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  if (appEnv.tmdbApiKey) {
    url.searchParams.set('api_key', appEnv.tmdbApiKey);
  }

  return url.toString();
}

export function getTmdbImageUrl(path: string, size = 'w780') {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${appEnv.tmdbImageBaseUrl}/${size}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function tmdbFetch<T>(path: string, options: TmdbRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (appEnv.tmdbReadAccessToken) {
    headers.set('Authorization', `Bearer ${appEnv.tmdbReadAccessToken}`);
  }

  const response = await fetch(buildTmdbUrl(path, options.query), {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`TMDB request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}
