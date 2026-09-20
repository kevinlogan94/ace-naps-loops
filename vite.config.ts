import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const SAVE = '/__save-video';
const VIDEO_JSON = resolve(import.meta.dirname, 'src/data/videos/fall-yard.json');

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'save-video',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.split('?')[0] !== SAVE || req.method !== 'POST') return next();
          const chunks: Buffer[] = [];
          req.on('data', (c: Buffer) => chunks.push(c));
          req.on('end', () => {
            try {
              const raw = Buffer.concat(chunks).toString('utf8');
              const obj = JSON.parse(raw);
              writeFileSync(VIDEO_JSON, JSON.stringify(obj, null, 2) + '\n');
              res.statusCode = 200;
              res.end('ok');
            } catch {
              res.statusCode = 400;
              res.end('invalid json');
            }
          });
        });
      },
    },
  ],
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
