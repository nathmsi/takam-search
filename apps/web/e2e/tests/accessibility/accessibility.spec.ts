import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from '../../fixtures.ts';
import { BrowsePage } from '../../pages/browse-page.ts';
import { HomePage } from '../../pages/home-page.ts';

async function violationsOf(page: Page): Promise<unknown[]> {
  return (await new AxeBuilder({ page }).analyze()).violations;
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`Accessibility (${theme} theme)`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem('takam-theme', value), theme);
    });

    test('the home page has no detectable violation', async ({ page }) => {
      await new HomePage(page).goto();

      expect(await violationsOf(page)).toEqual([]);
    });

    test('the list has no detectable violation', async ({ page }) => {
      await new BrowsePage(page).goto();

      expect(await violationsOf(page)).toEqual([]);
    });

    test('an instruction has no detectable violation', async ({ page }) => {
      await new BrowsePage(page).gotoDocument('H.1.2.1');

      expect(await violationsOf(page)).toEqual([]);
    });

    test('an instruction with its attached messages has no detectable violation', async ({ page }) => {
      const browse = new BrowsePage(page);
      await browse.gotoDocument('H.1.2.2');
      await expect(browse.detail.getByRole('region', { name: 'הודעות' })).toBeVisible();

      expect(await violationsOf(page)).toEqual([]);
    });

    test('the ranked results of a question have no detectable violation', async ({ page }) => {
      const browse = new BrowsePage(page);
      await browse.goto();
      await browse.search('האם אפשר לשלם מקדמה');
      await expect(page.getByText('אין הוראה שמכילה את כל המילים')).toBeVisible();

      expect(await violationsOf(page)).toEqual([]);
    });

    test('the empty state has no detectable violation', async ({ page }) => {
      const browse = new BrowsePage(page);
      await browse.goto();
      await browse.search('zzzzz');
      await expect(page.getByText('לא נמצאו הוראות')).toBeVisible();

      expect(await violationsOf(page)).toEqual([]);
    });
  });
}

test('the page is right-to-left Hebrew, and a keyboard user can skip to the content', async ({ page }) => {
  await new HomePage(page).goto();

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'he');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'דלג לתוכן' })).toBeFocused();
});
