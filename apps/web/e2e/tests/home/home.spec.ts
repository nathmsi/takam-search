import { expect, test } from '../../fixtures.ts';
import { BrowsePage } from '../../pages/browse-page.ts';
import { HomePage } from '../../pages/home-page.ts';

test.describe('Home', () => {
  test('opens with the welcome, the search and the 16 chapters as topics', async ({ page }) => {
    const home = new HomePage(page);

    await home.goto();

    await expect(home.welcome).toContainText('ברוכים הבאים');
    await expect(home.searchBox).toBeVisible();
    await expect(home.tiles).toHaveCount(16);
    await expect(home.tile('1')).toContainText('ביצוע תקציב');
    await expect(home.tile('1')).toContainText('59 מסמכים');
  });

  test('shows chapter 10, which the Takam site does not list', async ({ page }) => {
    const home = new HomePage(page);

    await home.goto();

    await expect(home.tile('10')).toContainText('ניהול מלאי ומצאי');
  });

  test('a topic opens the search on that chapter, every kind of document included', async ({ page }) => {
    const home = new HomePage(page);
    const browse = new BrowsePage(page);
    await home.goto();

    await home.tile('1').click();

    await expect(page).toHaveURL(/\/documents\?chapter=1&type=all$/);
    await expect(browse.total).toHaveText('סה"כ 59 הוראות');
    await expect(browse.mainChapter).toHaveValue('1');
  });

  test('the search of the home page opens the list with the words typed', async ({ page }) => {
    const home = new HomePage(page);
    const browse = new BrowsePage(page);
    await home.goto();

    await home.searchBox.fill('קופות ביטחון');
    await home.searchBox.press('Enter');

    await expect(browse.freeText).toHaveValue('קופות ביטחון');
    await expect(browse.total).toHaveText('סה"כ 4 הוראות');
  });

  test('"show all" opens the whole list of instructions', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.showAll.click();

    await expect(new BrowsePage(page).total).toHaveText('סה"כ 418 הוראות');
  });

  test('the header leads between the home page and the search', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await page.getByRole('navigation', { name: 'ניווט ראשי' }).getByRole('link', { name: 'חיפוש הוראות' }).click();
    await expect(new BrowsePage(page).total).toHaveText('סה"כ 418 הוראות');
    await page.getByRole('navigation', { name: 'ניווט ראשי' }).getByRole('link', { name: 'דף הבית' }).click();

    await expect(home.welcome).toBeVisible();
  });
});
