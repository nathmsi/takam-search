import { expect, test } from '../../fixtures.ts';
import { BrowsePage } from '../../pages/browse-page.ts';

test.describe('Browse: the list', () => {
  test('lists the 418 instructions as a tree of chapters that opens', async ({ page }) => {
    const browse = new BrowsePage(page);

    await browse.goto();

    await expect(browse.total).toHaveText('סה"כ 418 הוראות');
    await expect(browse.typeSelect).toHaveValue('Instruction');
    await expect(browse.node('1')).toHaveAttribute('aria-expanded', 'false');
    await browse.expandAll();
    await expect(browse.items).toHaveCount(418);
    await expect(browse.items.first()).toContainText('מבנה פרק 1 – ביצוע תקציב');
  });

  test('closes and opens a node of the tree', async ({ page }) => {
    const browse = new BrowsePage(page);
    await browse.goto('/documents?chapter=1');

    await expect(browse.node('1.1')).toHaveAttribute('aria-expanded', 'true');
    await browse.node('1.1').click();
    await expect(browse.node('1.1')).toHaveAttribute('aria-expanded', 'false');
    await expect(browse.items).toHaveCount(31);
    await page.getByRole('button', { name: 'צמצום רשימה' }).click();
    await expect(browse.items).toHaveCount(0);
    await browse.expandAll();

    await expect(browse.items).toHaveCount(34);
  });

  test('searches as the person types, and keeps the words in the address', async ({ page }) => {
    const browse = new BrowsePage(page);
    await browse.goto();

    await browse.search('מועדי תשלום');

    await expect(browse.total).toHaveText('סה"כ 1 הוראות');
    await expect(browse.items).toHaveText([/מועדי תשלום/]);
    await expect(page).toHaveURL(/q=/);
  });

  test('opens the best match of a search by itself on a wide screen, and nothing on a phone (it would hide the list)', async ({ page, isMobile }) => {
    const browse = new BrowsePage(page);
    await browse.goto();

    await browse.search('מועדי תשלום');

    if (isMobile) {
      await expect(browse.items).toHaveText([/מועדי תשלום/]);
      await expect(page).not.toHaveURL(/\/documents\/H/);
      return;
    }
    await expect(browse.detailTitle).toContainText('מועדי תשלום');
    await expect(page).toHaveURL(/\/documents\/H\.1\.4\.3\?q=/);
    await expect(browse.items.first()).toHaveAttribute('aria-current', 'page');
  });

  test('opens the first document of the chapter chosen from the home tiles, on a wide screen', async ({ page, isMobile }) => {
    test.skip(isMobile, 'on a phone nothing opens by itself');
    await page.goto('/documents?chapter=10&type=all');

    await expect(page.getByRole('region', { name: 'פרטי ההוראה' }).getByRole('heading', { level: 2 })).toContainText('הוראה מספר 10.');
    await expect(page).toHaveURL(/\/documents\/H\.10\./);
  });

  test('a new search replaces the document that is open by its best match, on a wide screen', async ({ page, isMobile }) => {
    test.skip(isMobile, 'on a phone nothing opens by itself');
    const browse = new BrowsePage(page);
    await browse.gotoDocument('H.1.2.1');
    await expect(browse.detailTitle).toContainText('ביצוע תקציב המדינה');

    await browse.search('עיקול');

    await expect(browse.detailTitle).toContainText('עיקול, המחאות זכות');
    await expect(page).toHaveURL(/\/documents\/H\.1\.6\.6\?q=/);
  });

  test('finds the same documents for the singular and the plural (the Takam site finds 2 and 4)', async ({ page }) => {
    const browse = new BrowsePage(page);
    await browse.goto();

    await browse.search('קופת ביטחון');
    await expect(browse.total).toHaveText('סה"כ 4 הוראות');
    await expect(browse.items.filter({ hasText: 'קופות ביטחון' })).toHaveCount(2);
    await browse.search('קופות ביטחון');

    await expect(browse.total).toHaveText('סה"כ 4 הוראות');
    await expect(browse.items.filter({ hasText: 'קופות ביטחון' })).toHaveCount(2);
  });

  test('finds H.7.1.5, merged into 7.1.1, which the Takam site leaves out of its tree', async ({ page }) => {
    const browse = new BrowsePage(page);
    await browse.goto();

    await browse.search('H.7.1.5');

    await expect(browse.total).toHaveText('סה"כ 1 הוראות');
    await expect(browse.items).toHaveText([/ועדת הפטור/]);
  });

  test('answers a question with the closest instructions, and says so', async ({ page }) => {
    const browse = new BrowsePage(page);
    await browse.goto();

    await browse.search('האם אפשר לשלם מקדמה');

    await expect(page.getByText('אין הוראה שמכילה את כל המילים')).toBeVisible();
    await expect(browse.items.filter({ hasText: 'תשלום מקדמות' }).first()).toBeVisible();
  });

  test('finds the instruction on budget overruns from a question', async ({ page }) => {
    const browse = new BrowsePage(page);
    await browse.goto();

    await browse.search('מה עושים כשיש חריגה');

    await expect(browse.items.filter({ hasText: 'ביצוע תקציב המדינה' })).toHaveCount(1);
  });

  test('starts from the words and filters of a shared address', async ({ page }) => {
    const browse = new BrowsePage(page);

    await browse.goto('/documents?q=התחייבות&chapter=1.3');

    await expect(browse.freeText).toHaveValue('התחייבות');
    await expect(browse.subChapter).toHaveValue(/^1\.3 - /);
    await expect(browse.items).toHaveText([/התחייבות בשם המדינה/, /התחייבות מסגרת/]);
  });

  test('filters by chapter, including chapter 10 that the Takam site does not list', async ({ page }) => {
    const browse = new BrowsePage(page);
    await browse.goto();

    await browse.choose(browse.mainChapter, /^10 - /);

    await expect(browse.total).toHaveText('סה"כ 21 הוראות');
    await browse.mainChapter.click();
    await expect(page.getByRole('option', { name: /ניהול מלאי ומצאי/ })).toHaveCount(1);
  });

  test('narrows the list of sub-chapters while typing, as on the official site, and chooses with the keyboard', async ({ page }) => {
    const browse = new BrowsePage(page);
    await browse.goto();

    await browse.typeIn(browse.subChapter, 'מכרז');

    const options = page.getByRole('listbox').getByRole('option');
    await expect(options.first()).toContainText('מכרז');
    expect(await options.count()).toBeLessThan(15);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/chapter=7\./);
    await expect(browse.subChapter).toHaveValue(/^7\.\d+ - /);
    await expect(page.getByRole('listbox')).toHaveCount(0);
  });

  test('says no chapter matches, and Escape closes the list without changing the choice', async ({ page }) => {
    const browse = new BrowsePage(page);
    await browse.goto('/documents?chapter=1.4');

    await browse.typeIn(browse.mainChapter, 'zzzz');
    await expect(page.getByText('לא נמצא פרק מתאים')).toBeVisible();
    await page.keyboard.press('Escape');

    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(browse.mainChapter).toHaveValue(/^1 - /);
    await expect(page).toHaveURL(/chapter=1\.4/);
  });

  test('filters by sub-chapter, and by kind of document', async ({ page }) => {
    const browse = new BrowsePage(page);
    await browse.goto();

    await browse.choose(browse.subChapter, /^1\.4 - /);
    await expect(browse.total).toHaveText('סה"כ 6 הוראות');
    await browse.typeSelect.selectOption('all');
    await expect(browse.total).toHaveText('סה"כ 7 הוראות');
    await browse.typeSelect.selectOption('Form');

    await expect(browse.total).toHaveText('סה"כ 1 הוראות');
  });

  test('lists the 9 temporary instructions under the chapter of their parent', async ({ page }) => {
    const browse = new BrowsePage(page);
    await browse.goto();

    await browse.typeSelect.selectOption('Temporary Instruction');

    await expect(browse.total).toHaveText('סה"כ 9 הוראות');
  });

  test('filters by validity, from the dates (the flag of the Takam API is the other way round)', async ({ page }) => {
    const browse = new BrowsePage(page);
    await browse.goto();
    await browse.typeSelect.selectOption('all');
    await expect(browse.total).toHaveText('סה"כ 922 הוראות');

    await browse.validity('לא בתוקף').click();

    await expect(browse.validity('לא בתוקף')).toBeChecked();
    await expect(browse.total).not.toHaveText('סה"כ 922 הוראות');
    await expect(browse.total).not.toHaveText('סה"כ 0 הוראות');
  });

  test('says nothing was found, and "clear" brings the list back', async ({ page }) => {
    const browse = new BrowsePage(page);
    await browse.goto();

    await browse.search('zzzzz');

    await expect(page.getByText('לא נמצאו הוראות')).toBeVisible();
    await page.getByRole('button', { name: 'נקה חיפוש' }).first().click();
    await expect(browse.total).toHaveText('סה"כ 418 הוראות');
  });

  test('can be used with the keyboard alone: type, reach a result, open it with Enter', async ({ page }) => {
    const browse = new BrowsePage(page);
    await browse.goto();

    await browse.freeText.focus();
    await page.keyboard.type('מועדי תשלום');
    await expect(browse.total).toHaveText('סה"כ 1 הוראות');
    await browse.item('מועדי תשלום').focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/documents\/H\.1\.4\.3/);
    await expect(browse.detailTitle).toContainText('מועדי תשלום');
  });
});

test.describe('Browse: the selected document', () => {
  test('shows the facts in the order of the official site', async ({ page }) => {
    const browse = new BrowsePage(page);

    await browse.gotoDocument('H.1.2.1');

    await expect(browse.detailTitle).toHaveText(/הוראה מספר 1\.2\.1 – ביצוע תקציב המדינה/);
    await expect(browse.facts).toHaveText(['פרק ראשי', 'פרק משני', 'סוג מידע', 'בתוקף', 'בתוקף מתאריך', 'סיום תוקף', 'מהדורה מספר']);
    await expect(browse.detail).toContainText('ללא תאריך סיום');
    await expect(browse.detail.getByRole('listitem').filter({ hasText: 'חריגה מהתקציב' })).toHaveCount(1);
  });

  test('shows H.7.1.5 with its chapter and its description, which says where it went', async ({ page }) => {
    const browse = new BrowsePage(page);

    await browse.gotoDocument('H.7.1.5');

    await expect(browse.detailTitle).toHaveText(/הוראה מספר 7\.1\.5 – ועדת הפטור/);
    await expect(browse.detail).toContainText('התקשרויות ורכישות');
    await expect(browse.detail).toContainText('ועדות מכרזים ועבודתן');
    await expect(browse.detail).toContainText('הוראה זו אוחדה עם הוראה 7.1.1');
  });

  test('lists the five messages attached to H.1.2.2, like the official site, and opens one', async ({ page }) => {
    const browse = new BrowsePage(page);
    await browse.gotoDocument('H.1.2.2');

    const messages = browse.detail.getByRole('region', { name: 'הודעות' });
    await expect(messages.getByRole('listitem')).toHaveCount(5);
    await expect(messages.getByRole('listitem').first()).toContainText('הנחיות לביצוע התקציב בשנת 2020');
    await expect(messages.getByRole('listitem').first()).toContainText('29 בספטמבר 2020');
    await expect(messages.getByRole('link', { name: /הורדת הקובץ/ })).toHaveCount(5);

    await messages.getByRole('link', { name: 'הנחיות לביצוע התקציב בשנת 2020', exact: true }).click();

    await expect(page).toHaveURL(/\/documents\/HOD\.1\.2\.2\.1/);
    await expect(browse.detailTitle).toContainText('הנחיות לביצוע התקציב בשנת 2020');
  });

  test('links to the file of the instruction, through the API (the click is not made here: it would download)', async ({ page }) => {
    const browse = new BrowsePage(page);

    await browse.gotoDocument('H.1.2.1');

    await expect(browse.detail.getByRole('link', { name: 'הורדת קובץ ההוראה' })).toHaveAttribute('href', /\/v1\/documents\/H\.1\.2\.1\/file$/);
  });

  test('links to the official page, in a new tab', async ({ page }) => {
    const browse = new BrowsePage(page);
    await browse.gotoDocument('H.1.2.1');

    const official = browse.detail.getByRole('link', { name: /לדף ההוראה באתר תכ"ם/ });

    await expect(official).toHaveAttribute('href', 'https://takam.mof.gov.il/document/H.1.2.1');
    await expect(official).toHaveAttribute('target', '_blank');
  });

  test('opens from the list, marks the document, and keeps the search', async ({ page, isMobile }) => {
    const browse = new BrowsePage(page);
    await browse.goto('/documents?chapter=1.4');

    await browse.item('מועדי תשלום').click();

    await expect(page).toHaveURL(/\/documents\/H\.1\.4\.3\?chapter=1\.4$/);
    await expect(browse.detailTitle).toContainText('מועדי תשלום');
    if (!isMobile) await expect(browse.item('מועדי תשלום')).toHaveAttribute('aria-current', 'page');
  });

  test('puts the document in the tab title', async ({ page }) => {
    await page.goto('/documents/H.1.4.3');

    await expect(page).toHaveTitle(/1\.4\.3 מועדי תשלום/);
  });

  test('on a phone shows one thing at a time and goes back to the list with the same search; on a desktop shows both', async ({ page, isMobile }) => {
    const browse = new BrowsePage(page);
    await browse.goto('/documents?chapter=1.4');
    await browse.item('מועדי תשלום').click();
    await expect(browse.detailTitle).toContainText('מועדי תשלום');

    if (isMobile) {
      await expect(browse.list).toBeHidden();
      await page.getByRole('link', { name: 'חזרה לרשימה' }).click();
      await expect(browse.list).toBeVisible();
      await expect(browse.subChapter).toHaveValue(/^1\.4 - /);
    } else {
      await expect(browse.list).toBeVisible();
      await expect(browse.detail).toBeVisible();
    }
  });

  test.describe('an address that leads nowhere', () => {
    // The browser logs the 404 answer of the API as a console error: expected here.
    test.use({ expectedConsoleErrors: [/status of 404/] });

    test('says the document was not found', async ({ page }) => {
      await page.goto('/documents/H.99.9.9');

      await expect(page.getByText('המסמך לא נמצא')).toBeVisible();
    });
  });

  test('says the page was not found for an unknown address', async ({ page }) => {
    await page.goto('/no/such/page');

    await expect(page.getByText('העמוד לא נמצא')).toBeVisible();
  });

  test.describe('search by meaning (experiment)', () => {
    test('is off by default, and ticking it asks the server for meaning and says the list is by meaning', async ({ page }) => {
      const browse = new BrowsePage(page);
      const asked: string[] = [];
      await page.route('**/v1/documents?*meaning=yes*', (route) => {
        asked.push(route.request().url());
        return route.fulfill({
          json: {
            total: 1,
            relaxed: false,
            meaning: true,
            items: [{ id: 1, codeText: 'H.1.4.5', code: '1.4.5', title: 'מקדמות', type: 'Instruction', description: null, keywords: [], version: 1, validFrom: null, validTo: null, isInForce: true, chapterCode: '1.4', chapterTitle: 'ביצוע תשלומים', mainChapterCode: '1', mainChapterTitle: 'ביצוע תקציב', officialPageUrl: 'https://takam.mof.gov.il/document/H.1.4.5', fileUrl: '/v1/documents/H.1.4.5/file' }],
          },
        });
      });
      await browse.goto('/documents?q=מקדמות');
      await expect(browse.meaning).toHaveAttribute('aria-pressed', 'false');

      await browse.meaning.click();

      await expect(browse.meaning).toHaveAttribute('aria-pressed', 'true');
      await expect(page).toHaveURL(/meaning=yes/);
      await expect(page.getByRole('status').filter({ hasText: 'לפי משמעות' })).toBeVisible();
      await expect(browse.items).toHaveText([/מקדמות/]);
      expect(asked).toHaveLength(1);
    });

    test.describe('when the server has no AI key', () => {
      test('starts ticked from a shared address, falls back on the search by words and says so, and unticking removes the notice', async ({ page }) => {
        const browse = new BrowsePage(page);

        await page.goto('/documents?q=מקדמות&meaning=yes');

        await expect(browse.meaning).toHaveAttribute('aria-pressed', 'true');
        await expect(page.getByRole('status').filter({ hasText: 'אינו זמין כרגע' })).toBeVisible();
        await expect(browse.items.first()).toContainText('מקדמות');
        await browse.meaning.click();
        await expect(browse.meaning).toHaveAttribute('aria-pressed', 'false');
        await expect(page.getByRole('status').filter({ hasText: 'אינו זמין כרגע' })).toHaveCount(0);
        await expect(page).not.toHaveURL(/meaning/);
      });
    });
  });
});
