import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { MeaningToggle } from './MeaningToggle';

function Address() {
  const { pathname, search } = useLocation();
  return <output>{pathname + search}</output>;
}

function renderAt(address: string) {
  render(
    <MemoryRouter initialEntries={[address]}>
      <MeaningToggle />
      <Address />
    </MemoryRouter>,
  );
}

describe('MeaningToggle', () => {
  it('is not there on the home page', () => {
    renderAt('/');

    expect(screen.queryByRole('button', { name: /חיפוש לפי משמעות/ })).not.toBeInTheDocument();
  });

  it('is off by default on the search page and says so to screen readers', () => {
    renderAt('/documents?q=עיקול');

    expect(screen.getByRole('button', { name: 'חיפוש לפי משמעות (ניסיוני)' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('turns on and off by writing meaning=yes in the address and keeping the rest', async () => {
    renderAt('/documents/H.1.6.6?q=עיקול');
    const toggle = screen.getByRole('button', { name: /חיפוש לפי משמעות/ });

    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('/documents/H.1.6.6?q=%D7%A2%D7%99%D7%A7%D7%95%D7%9C&meaning=yes');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('status')).not.toHaveTextContent('meaning');
  });
});
