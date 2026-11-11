import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { DOCUMENTS } from '../../../tests/support/fixtures';
import { ResultList } from './ResultList';

function renderResults(props: Partial<React.ComponentProps<typeof ResultList>> = {}) {
  return render(
    <MemoryRouter>
      <ResultList items={[DOCUMENTS.payments, DOCUMENTS.form]} total={2} relaxed={false} meaning={false} selectedCodeText={undefined} search="?q=x" {...props} />
    </MemoryRouter>,
  );
}

describe('ResultList', () => {
  it('shows the total and the documents in the order they were given, each with its number, kind, status and place', () => {
    renderResults();

    expect(screen.getByText('סה"כ 2 הוראות')).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveTextContent('1.4.3');
    expect(links[0]).toHaveTextContent('הוראה');
    expect(links[0]).toHaveTextContent('בתוקף');
    expect(links[0]).toHaveTextContent('ביצוע תקציב · ביצוע תשלומים בגין התחייבויות');
    expect(links[1]).toHaveTextContent('טופס');
  });

  it('keeps the search on every link and marks the selected document', () => {
    renderResults({ selectedCodeText: 'H.1.4.3' });

    expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', '/documents/H.1.4.3?q=x');
    expect(screen.getAllByRole('link')[0]).toHaveAttribute('aria-current', 'page');
    expect(screen.getAllByRole('link')[1]).not.toHaveAttribute('aria-current');
  });

  it('says when these are only the closest documents', () => {
    renderResults({ relaxed: true });

    expect(screen.getByRole('status')).toHaveTextContent('אין הוראה שמכילה את כל המילים');
  });

  it('says when the list comes from the search by meaning (an experiment)', () => {
    renderResults({ meaning: true });

    expect(screen.getByRole('status')).toHaveTextContent('לפי משמעות');
  });

  it('says nothing about "closest" for a normal answer', () => {
    renderResults({ relaxed: false });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('says a document is not in force with a word', () => {
    renderResults({ items: [DOCUMENTS.foreign], total: 1 });

    expect(screen.getByText('לא בתוקף')).toBeInTheDocument();
  });
});
