import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5174,
    host: true,
    headers: { 'Cache-Control': 'no-cache' },
  },
  preview: {
    headers: { 'Cache-Control': 'no-cache' },
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
  },
});
