import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// The tests never reach the network: the pages talk to a fake API (tests/support/fake-api.ts).
vi.stubEnv('VITE_API_URL', '');

// jsdom has no scrollTo: the layout calls it when the page changes.
window.scrollTo = vi.fn();

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
