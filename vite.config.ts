import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { inspectAttr } from 'kimi-plugin-inspect-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE_PATH && env.VITE_BASE_PATH.trim() ? env.VITE_BASE_PATH : '/';

  return {
    base,
    plugins: [inspectAttr(), react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
