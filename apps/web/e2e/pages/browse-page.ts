import type { Locator, Page } from '@playwright/test';

/** The search page: the filters across the top, the tree on one side, the selected instruction on the other. */
export class BrowsePage {
  readonly freeText: Locator;
  readonly mainChapter: Locator;
  readonly subChapter: Locator;
  readonly typeSelect: Locator;
  readonly total: Locator;
  readonly list: Locator;
  readonly items: Locator;
  readonly detail: Locator;
  readonly detailTitle: Locator;
  readonly facts: Locator;

  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.freeText = page.getByRole('searchbox', { name: 'טקסט חופשי' });
    this.mainChapter = page.getByRole('combobox', { name: 'פרק ראשי' });
    this.subChapter = page.getByRole('combobox', { name: 'פרק משני' });
    this.typeSelect = page.getByRole('combobox', { name: 'סוג מידע' });
    this.total = page.getByText(/^סה"כ \d+ הוראות$/);
    this.list = page.getByRole('region', { name: 'הוראות תכ"ם' });
    this.items = this.list.getByRole('link');
    this.detail = page.getByRole('region', { name: 'פרטי ההוראה' });
    this.detailTitle = this.detail.getByRole('heading', { level: 2 });
    this.facts = this.detail.getByRole('term');
  }

  async goto(path = '/documents'): Promise<void> {
    await this.page.goto(path);
    await this.total.waitFor();
  }

  /** Opens an instruction straight from its address. On a phone the list is hidden then, so it waits for the instruction. */
  async gotoDocument(code: string): Promise<void> {
    await this.page.goto(`/documents/${code}`);
    await this.detailTitle.waitFor();
  }

  async search(words: string): Promise<void> {
    await this.freeText.fill(words);
  }

  validity(name: 'הכל' | 'בתוקף' | 'לא בתוקף'): Locator {
    return this.page.getByRole('radio', { name });
  }

  item(title: string): Locator {
    return this.list.getByRole('link', { name: new RegExp(title) });
  }

  /** A chapter or a sub-chapter of the tree, by its number. */
  node(code: string): Locator {
    return this.list.getByRole('button', { name: new RegExp(`^${code.replace('.', '\\.')}\\s`) });
  }

  async expandAll(): Promise<void> {
    await this.page.getByRole('button', { name: 'הרחבת רשימה' }).click();
  }
}
