import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// The dev and preview servers forward the API routes to the NestJS server, so the browser talks to one origin.
const API = { target: process.env.API_PROXY_TARGET ?? 'http://localhost:3100', changeOrigin: true };
const proxy = { '/v1': API, '/health': API };

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy },
  preview: { port: 4173, strictPort: true, proxy },
  test: {
    exclude: ['**/node_modules/**', 'e2e/**'],
    projects: [
      { extends: true, test: { name: 'unit', environment: 'node', include: ['src/**/*.test.ts'] } },
      { extends: true, test: { name: 'component', environment: 'jsdom', include: ['src/**/*.test.tsx'], setupFiles: ['./tests/support/setup.ts'] } },
    ],
  },
});
