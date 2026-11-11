import { expect, test } from '../../fixtures.ts';
import { HomePage } from '../../pages/home-page.ts';

test.describe('Theme', () => {
  // The system prefers dark, the page still opens light: the official site is light, and light is the default here.
  test.use({ colorScheme: 'dark' });

  test('opens in the light theme whatever the system prefers', async ({ page }) => {
    await new HomePage(page).goto();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.getByRole('button', { name: 'מעבר למצב כהה' })).toBeVisible();
  });

  test('switches to dark with the button, and remembers it on the next visit', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await page.getByRole('button', { name: 'מעבר למצב כהה' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('button', { name: 'מעבר למצב בהיר' })).toBeVisible();
    await page.getByRole('button', { name: 'מעבר למצב בהיר' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('a chosen dark theme is on the page from the first paint (no flash of light)', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('takam-theme', 'dark'));

    await page.goto('/');

    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(background).toBe('rgb(11, 18, 32)');
  });
});
