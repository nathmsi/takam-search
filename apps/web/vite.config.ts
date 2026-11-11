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
    // Measured with `pnpm test:coverage`. The bars sit a little under what is measured today (statements 97.9, branches 93.7,
    // functions 96.7, lines 98.8 on 2026-11-11): a change that lowers the coverage fails the pipeline.
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/main.tsx', 'src/**/*.test.*', 'src/**/*.d.ts'],
      reporter: ['text-summary', 'text'],
      thresholds: { statements: 95, branches: 90, functions: 94, lines: 96 },
    },
    projects: [
      { extends: true, test: { name: 'unit', environment: 'node', include: ['src/**/*.test.ts'] } },
      { extends: true, test: { name: 'component', environment: 'jsdom', include: ['src/**/*.test.tsx'], setupFiles: ['./tests/support/setup.ts'] } },
    ],
  },
});
