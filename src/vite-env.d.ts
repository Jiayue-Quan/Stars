/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string;
  readonly VITE_BASE_PATH?: string;
  readonly VITE_ROUTER_MODE?: 'hash' | 'browser';
  readonly VITE_TMDB_API_KEY?: string;
  readonly VITE_TMDB_READ_ACCESS_TOKEN?: string;
  readonly VITE_TMDB_BASE_URL?: string;
  readonly VITE_TMDB_IMAGE_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
