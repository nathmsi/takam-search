import { expect, test as base } from '@playwright/test';

interface Options {
  /**
   * Console errors a test expects (the browser logs every 4xx answer as one). Anything else fails the test: a page that
   * writes an error to the console, or throws, is a bug nobody should miss.
   */
  expectedConsoleErrors: RegExp[];
}

/** Every spec imports `test` and `expect` from here, never from `@playwright/test`. */
export const test = base.extend<Options>({
  expectedConsoleErrors: [[], { option: true }],
  page: async ({ page, expectedConsoleErrors }, use) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' && !expectedConsoleErrors.some((pattern) => pattern.test(message.text()))) errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await use(page);
    expect(errors, 'errors written to the console').toEqual([]);
  },
});

export { expect } from '@playwright/test';
