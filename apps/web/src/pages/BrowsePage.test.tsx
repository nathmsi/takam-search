import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installFakeApi } from '../../tests/support/fake-api';
import { DOCUMENTS } from '../../tests/support/fixtures';
import { renderApp } from '../../tests/support/render-app';

const { budget, payments, foreign, form, accounting } = DOCUMENTS;
const ALL = [budget, payments, foreign, form, accounting];

/** The documents in the list (the links of the tree or of the results), in order. */
function listed(): string[] {
  const list = screen.getByRole('region', { name: 'הוראות תכ"ם' });
  return within(list)
    .getAllByRole('link')
    .map((link) => link.textContent ?? '');
}

describe('BrowsePage, the filters and the list', () => {
  it('shows the filters in the order of the official site, then the list with its total', async () => {
    installFakeApi({ documents: ALL });

    renderApp('/documents');

    const labels = screen.getAllByText(/^(טקסט חופשי|פרק ראשי|פרק משני|סוג מידע|תוקף)$/).map((label) => label.textContent);
    expect(labels).toEqual(['טקסט חופשי', 'פרק ראשי', 'פרק משני', 'סוג מידע', 'תוקף']);
    expect(await screen.findByText('סה"כ 4 הוראות')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'הכל' })).toBeChecked();
  });

  it('asks for the instructions by default, and the type filter says so', async () => {
    const api = installFakeApi({ documents: ALL });

    renderApp('/documents');

    expect(await screen.findByRole('combobox', { name: 'סוג מידע' })).toHaveValue('Instruction');
    await screen.findByText('סה"כ 4 הוראות');
    expect(api.requests.find((request) => request.startsWith('/v1/documents?'))).toContain('type=Instruction');
  });

  it('shows the documents as a tree of chapters and sub-chapters, and closes and opens a node', async () => {
    installFakeApi({ documents: ALL });
    const { user } = renderApp('/documents');

    const node = await screen.findByRole('button', { name: /1.2\s*טיפול בתקציב/ });
    expect(node).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /^1\s*ביצוע תקציב$/ })).toBeInTheDocument();
    await user.click(node);

    expect(node).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: /ביצוע תקציב המדינה/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'הרחבת רשימה' }));
    expect(screen.getByRole('link', { name: /ביצוע תקציב המדינה/ })).toBeVisible();
  });

  it('shows a ranked list instead of the tree once words are typed, and writes them in the address', async () => {
    const api = installFakeApi({ documents: ALL });
    const { user } = renderApp('/documents');
    await screen.findByText('סה"כ 4 הוראות');

    await user.type(screen.getByRole('searchbox', { name: 'טקסט חופשי' }), 'תשלום');

    expect(await screen.findByText('סה"כ 1 הוראות')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'הרחבת רשימה' })).not.toBeInTheDocument();
    expect(listed()).toHaveLength(1);
    expect(listed()[0]).toContain('מועדי תשלום');
    expect(api.requests.at(-1)).toContain('q=%D7%AA%D7%A9%D7%9C%D7%95%D7%9D');
  });

  it('does not search at every key', async () => {
    const api = installFakeApi({ documents: ALL });
    const { user } = renderApp('/documents');
    await screen.findByText('סה"כ 4 הוראות');
    const before = api.requests.filter((request) => request.startsWith('/v1/documents?')).length;

    await user.type(screen.getByRole('searchbox'), 'תשלום');
    await screen.findByText('סה"כ 1 הוראות');

    expect(api.requests.filter((request) => request.startsWith('/v1/documents?')).length - before).toBe(1);
  });

  it('says so when no document has every word and shows the closest ones', async () => {
    installFakeApi({ documents: ALL });

    renderApp('/documents?q=תשלום ביטחון');

    expect(await screen.findByText(/אין הוראה שמכילה את כל המילים/)).toBeInTheDocument();
    expect(listed()[0]).toContain('מועדי תשלום');
  });

  it('starts from the words and filters of the address', async () => {
    installFakeApi({ documents: ALL });

    renderApp('/documents?q=תשלום&chapter=1.4');

    expect(screen.getByRole('searchbox')).toHaveValue('תשלום');
    await waitFor(() => expect((screen.getByRole('combobox', { name: 'פרק משני' }) as HTMLInputElement).value).toMatch(/^1\.4 - /));
    expect((screen.getByRole('combobox', { name: 'פרק ראשי' }) as HTMLInputElement).value).toMatch(/^1 - /);
    expect(await screen.findByText('סה"כ 1 הוראות')).toBeInTheDocument();
  });

  it('filters by sub-chapter', async () => {
    installFakeApi({ documents: ALL });
    const { user } = renderApp('/documents');
    await screen.findByText('סה"כ 4 הוראות');

    await user.click(await screen.findByRole('combobox', { name: 'פרק משני' }));
    await user.click(screen.getByRole('option', { name: /^1\.4 - / }));

    expect(await screen.findByText('סה"כ 1 הוראות')).toBeInTheDocument();
  });

  it('keeps the chapter when the sub-chapter is put back to "all"', async () => {
    installFakeApi({ documents: ALL });
    const { user } = renderApp('/documents?chapter=1.4');
    const sub = await screen.findByRole('combobox', { name: 'פרק משני' });

    await user.click(sub);
    await user.click(within(screen.getByRole('listbox', { name: 'פרק משני' })).getByRole('option', { name: 'הכל' }));

    expect(await screen.findByText('סה"כ 3 הוראות')).toBeInTheDocument();
    expect((screen.getByRole('combobox', { name: 'פרק ראשי' }) as HTMLInputElement).value).toMatch(/^1 - /);
  });

  it('filters by kind of document, and "all" shows every kind', async () => {
    installFakeApi({ documents: ALL });
    const { user } = renderApp('/documents');
    await screen.findByText('סה"כ 4 הוראות');

    await user.selectOptions(screen.getByRole('combobox', { name: 'סוג מידע' }), 'Form');
    expect(await screen.findByText('סה"כ 1 הוראות')).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'סוג מידע' }), 'all');

    expect(await screen.findByText('סה"כ 5 הוראות')).toBeInTheDocument();
  });

  it('filters by validity', async () => {
    installFakeApi({ documents: ALL });
    const { user } = renderApp('/documents');
    await screen.findByText('סה"כ 4 הוראות');

    await user.click(screen.getByRole('radio', { name: 'לא בתוקף' }));

    expect(await screen.findByText('סה"כ 1 הוראות')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'לא בתוקף' })).toBeChecked();
  });

  it('says nothing was found, and "clear" brings the list back', async () => {
    installFakeApi({ documents: ALL });
    const { user } = renderApp('/documents');
    await screen.findByText('סה"כ 4 הוראות');

    await user.type(screen.getByRole('searchbox'), 'zzz');
    expect(await screen.findByText('לא נמצאו הוראות')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'נקה חיפוש' })[0]);

    expect(await screen.findByText('סה"כ 4 הוראות')).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });

  it('clears the words with the button of the field', async () => {
    installFakeApi({ documents: ALL });
    const { user } = renderApp('/documents?q=תשלום');
    await screen.findByText('סה"כ 1 הוראות');

    await user.click(screen.getByRole('button', { name: 'ניקוי החיפוש' }));

    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(await screen.findByText('סה"כ 4 הוראות')).toBeInTheDocument();
  });

  it('says it failed, and tries again on request', async () => {
    const api = installFakeApi({ documents: ALL, failing: true });
    const { user } = renderApp('/documents');
    expect(await screen.findByRole('alert')).toHaveTextContent('לא הצלחנו לטעון את ההוראות');

    api.fail(false);
    await user.click(screen.getByRole('button', { name: 'ניסיון חוזר' }));

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(await screen.findByText('סה"כ 4 הוראות')).toBeInTheDocument();
  });
});

describe('BrowsePage, the selected document', () => {
  it('asks to pick a document when none is selected', async () => {
    installFakeApi({ documents: ALL });

    renderApp('/documents');

    expect(await screen.findByText('בחרו הוראה מהרשימה כדי לראות את פרטיה.')).toBeInTheDocument();
  });

  it('opens a document from the list, marks it, and keeps the filters on the link', async () => {
    installFakeApi({ documents: ALL });
    const { user } = renderApp('/documents?chapter=1.2');
    const link = await screen.findByRole('link', { name: /ביצוע תקציב המדינה/ });
    expect(link).toHaveAttribute('href', '/documents/H.1.2.1?chapter=1.2');

    await user.click(link);

    expect(await screen.findByRole('heading', { level: 2, name: /הוראה מספר 1\.2\.1/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ביצוע תקציב המדינה/ })).toHaveAttribute('aria-current', 'page');
  });

  it('shows the facts in the order of the official site', async () => {
    installFakeApi({ documents: ALL });

    renderApp('/documents/H.1.2.1');

    const title = await screen.findByRole('heading', { level: 2, name: /הוראה מספר 1\.2\.1 – ביצוע תקציב המדינה/ });
    const panel = title.closest('article') as HTMLElement;
    expect(within(panel).getAllByRole('term').map((term) => term.textContent)).toEqual([
      'פרק ראשי',
      'פרק משני',
      'סוג מידע',
      'בתוקף',
      'בתוקף מתאריך',
      'סיום תוקף',
      'מהדורה מספר',
    ]);
    expect(within(panel).getByText('ביצוע תקציב', { selector: 'dd' })).toBeInTheDocument();
    expect(within(panel).getByText('ללא תאריך סיום')).toBeInTheDocument();
    expect(within(panel).getByText('6 במאי 2026', { selector: 'dd' })).toBeInTheDocument();
  });

  it('shows the description and the keywords when the document has them', async () => {
    installFakeApi({ documents: ALL });

    renderApp('/documents/H.1.4.3');

    const keywords = await screen.findByRole('list', { name: '' }).catch(() => screen.getAllByRole('list').at(-1) as HTMLElement);
    expect(within(keywords).getByText('תשלום')).toBeInTheDocument();
    expect(screen.getByText('מתי משלמים לספק')).toBeInTheDocument();
  });

  it('shows the end date and the kind of a document that is over', async () => {
    installFakeApi({ documents: ALL });

    renderApp('/documents/H.1.6.4');

    expect(await screen.findByText('31 בדצמבר 2025')).toBeInTheDocument();
    expect(screen.getByText('לא', { selector: 'dd' })).toBeInTheDocument();
  });

  it('names the kind of a form in its title', async () => {
    installFakeApi({ documents: ALL });

    renderApp('/documents/T.1.4.1');

    expect(await screen.findByRole('heading', { level: 2, name: /טופס מספר 1\.4\.1/ })).toBeInTheDocument();
  });

  it('links to the official page, in a new tab', async () => {
    installFakeApi({ documents: ALL });

    renderApp('/documents/H.1.2.1');

    const official = await screen.findByRole('link', { name: /לדף ההוראה באתר תכ"ם/ });
    expect(official).toHaveAttribute('href', 'https://takam.mof.gov.il/document/H.1.2.1');
    expect(official).toHaveAttribute('target', '_blank');
    expect(official).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('says the document was not found (404) and keeps the list', async () => {
    installFakeApi({ documents: ALL });

    renderApp('/documents/H.9.9.9');

    expect(await screen.findByText('המסמך לא נמצא')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /ביצוע תקציב המדינה/ })).toBeInTheDocument();
  });

  it('has a way back to the list that keeps the words typed (the phone shows one thing at a time)', async () => {
    installFakeApi({ documents: ALL });

    renderApp('/documents/H.1.2.1?q=תקציב');

    expect(await screen.findByRole('link', { name: 'חזרה לרשימה' })).toHaveAttribute('href', '/documents?q=%D7%AA%D7%A7%D7%A6%D7%99%D7%91');
  });
});

describe('BrowsePage, the best match opens by itself', () => {
  const screenIs = (wide: boolean): void => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: wide, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  };

  afterEach(() => {
    // @ts-expect-error: back to the jsdom default, which has no matchMedia (the app then treats the screen as narrow)
    delete window.matchMedia;
  });

  it('opens the best match of a search on a wide screen', async () => {
    screenIs(true);
    installFakeApi({ documents: ALL });

    renderApp('/documents?q=תשלום');

    const detail = await screen.findByRole('region', { name: 'פרטי ההוראה' });
    expect(await within(detail).findByRole('heading', { level: 2, name: /מועדי תשלום/ })).toBeInTheDocument();
  });

  it('keeps a document opened from the address (a shared link), even if it is not the best match', async () => {
    screenIs(true);
    const second = { ...payments, id: 9, codeText: 'H.1.4.9', title: 'תשלום נוסף' };
    installFakeApi({ documents: [...ALL, second] });

    renderApp('/documents/H.1.4.9?q=תשלום');

    const detail = await screen.findByRole('region', { name: 'פרטי ההוראה' });
    expect(await within(detail).findByRole('heading', { level: 2, name: /תשלום נוסף/ })).toBeInTheDocument();
  });

  it('opens the best match of a new search even when another document is already open', async () => {
    screenIs(true);
    installFakeApi({ documents: ALL });
    const { user } = renderApp('/documents/H.1.6.4');
    const detail = await screen.findByRole('region', { name: 'פרטי ההוראה' });
    expect(await within(detail).findByRole('heading', { level: 2, name: /תשלומים במטבע חוץ/ })).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: 'טקסט חופשי' }), 'תשלום');

    expect(await within(detail).findByRole('heading', { level: 2, name: /מועדי תשלום/ })).toBeInTheDocument();
  });

  it('opens nothing by itself on a narrow screen, where opening a document would hide the list', async () => {
    screenIs(false);
    installFakeApi({ documents: ALL });

    renderApp('/documents?q=תשלום');

    await screen.findByText('סה"כ 1 הוראות');
    expect(screen.getByText('בחרו הוראה מהרשימה כדי לראות את פרטיה.')).toBeInTheDocument();
  });

  it('opens the first document of a chapter chosen (the tiles of the home page)', async () => {
    screenIs(true);
    installFakeApi({ documents: ALL });

    renderApp('/documents?chapter=1.4');

    const detail = await screen.findByRole('region', { name: 'פרטי ההוראה' });
    expect(await within(detail).findByRole('heading', { level: 2, name: /מועדי תשלום/ })).toBeInTheDocument();
  });

  it('opens nothing without words or chapter (the whole tree), nor when nothing was found', async () => {
    screenIs(true);
    installFakeApi({ documents: ALL });

    renderApp('/documents');

    await screen.findByText('סה"כ 4 הוראות');
    expect(screen.getByText('בחרו הוראה מהרשימה כדי לראות את פרטיה.')).toBeInTheDocument();
  });
});
