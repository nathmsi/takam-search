import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { installFakeApi } from '../../tests/support/fake-api';
import { CHAPTERS } from '../../tests/support/fixtures';
import { renderApp } from '../../tests/support/render-app';

describe('HomePage', () => {
  it('opens with the welcome, the search and the topics, in that order', async () => {
    installFakeApi({ documents: [] });

    renderApp();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ברוכים הבאים לחיפוש בהוראות תכ"ם');
    expect(screen.getByRole('searchbox', { name: 'חיפוש הוראות תכ"ם' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'נושאי הוראות תכ"ם' })).toBeInTheDocument();
  });

  it('shows a tile for each chapter, with its number, name and number of documents', async () => {
    installFakeApi({ documents: [] });

    renderApp();

    const tile = await screen.findByRole('link', { name: /ביצוע תקציב/ });
    expect(tile).toHaveAttribute('href', '/documents?chapter=1&type=all');
    expect(within(tile).getByText('1')).toBeInTheDocument();
    expect(within(tile).getByText('4 מסמכים')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /חשבונאות ממשלתית/ })).toHaveTextContent('מסמך אחד');
    expect(screen.getAllByRole('listitem')).toHaveLength(CHAPTERS.filter((chapter) => chapter.parentCode === null).length);
  });

  it('leads to the whole list', async () => {
    installFakeApi({ documents: [] });

    renderApp();

    expect(await screen.findByRole('link', { name: 'הצגת כל ההוראות' })).toHaveAttribute('href', '/documents');
  });

  it('opens the search with the words that were typed', async () => {
    installFakeApi({ documents: [] });
    const { user } = renderApp();

    await user.type(screen.getByRole('searchbox'), 'תשלום');
    await user.click(screen.getByRole('button', { name: 'חיפוש' }));

    expect(await screen.findByRole('searchbox', { name: 'טקסט חופשי' })).toHaveValue('תשלום');
  });

  it('opens the search without words when the field is empty (Enter works too)', async () => {
    installFakeApi({ documents: [] });
    const { user } = renderApp();

    await user.type(screen.getByRole('searchbox'), '{Enter}');

    expect(await screen.findByRole('searchbox', { name: 'טקסט חופשי' })).toHaveValue('');
  });

  it('says the topics could not be loaded, and tries again on request', async () => {
    const api = installFakeApi({ documents: [], failing: true });
    const { user } = renderApp();
    expect(await screen.findByRole('alert')).toHaveTextContent('לא הצלחנו לטעון את הנושאים.');

    api.fail(false);
    await user.click(screen.getByRole('button', { name: 'ניסיון חוזר' }));

    expect(await screen.findByRole('link', { name: /ביצוע תקציב/ })).toBeInTheDocument();
  });
});
