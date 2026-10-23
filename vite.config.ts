import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api/janitor': {
        target: 'https://janitorai.com/hampter',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/janitor/, ''),
        headers: {
          'Referer': 'https://janitorai.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        },
      },
      '/api/janitor-media': {
        target: 'https://ella.janitorai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/janitor-media/, ''),
        headers: {
          'Referer': 'https://janitorai.com/',
        },
      },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
});
