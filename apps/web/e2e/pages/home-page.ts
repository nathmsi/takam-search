import type { Locator, Page } from '@playwright/test';

/** The home page: the welcome, the search, the topics and the way to the whole list. */
export class HomePage {
  readonly welcome: Locator;
  readonly searchBox: Locator;
  readonly tiles: Locator;
  readonly showAll: Locator;

  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.welcome = page.getByRole('heading', { level: 1 });
    this.searchBox = page.getByRole('searchbox', { name: 'חיפוש הוראות תכ"ם' });
    this.tiles = page.getByRole('main').getByRole('listitem').getByRole('link');
    this.showAll = page.getByRole('link', { name: 'הצגת כל ההוראות' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.tiles.first().waitFor();
  }

  tile(code: string): Locator {
    // The number alone: `1` must not match 10, 11...
    return this.tiles.filter({ hasText: new RegExp(`^${code}(?=\\D)`) });
  }
}
