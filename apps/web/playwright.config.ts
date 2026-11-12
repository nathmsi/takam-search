import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

// Own ports, so the tests never meet the servers of `pnpm dev` (3100 and 5173).
const API_URL = 'http://localhost:3199';
const WEB_URL = 'http://localhost:4173';

// The E2E tests run on the real thing: the built NestJS server over its database (in memory, filled at startup from the saved answers of the site in `apps/server/test/fixtures`), and the built web app (vite preview),
// which forwards /v1 to the server. Build both first (`pnpm test:e2e` does).
export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: WEB_URL,
    locale: 'he-IL',
    colorScheme: 'light',
    // Animations off by default: fast and deterministic.
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: [
    // Never reuse a server that is already there: it could be the development one, with other data.
    { command: 'node ../server/dist/main.js', url: `${API_URL}/health`, env: { PORT: '3199', DATABASE_DIR: 'memory://', TAKAM_DATA_DIR: fileURLToPath(new URL('../server/test/fixtures', import.meta.url)), CORS_ORIGINS: WEB_URL, GEMINI_API_KEY: '' }, reuseExistingServer: false },
    { command: 'pnpm preview', url: WEB_URL, env: { API_PROXY_TARGET: API_URL }, reuseExistingServer: false },
  ],
});
