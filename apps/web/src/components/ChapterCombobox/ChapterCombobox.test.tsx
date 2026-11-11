import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { ChapterCombobox } from './ChapterCombobox';

const OPTIONS = [
  { code: '1', title: 'ביצוע תקציב' },
  { code: '2', title: 'חשבונאות ממשלתית' },
  { code: '7', title: 'התקשרויות ורכישות' },
];

/** The field with the state a page gives it, and a line that shows the code chosen. */
function Harness({ start = '' }: { start?: string }) {
  const [value, setValue] = useState(start);
  return (
    <>
      <ChapterCombobox label="פרק ראשי" value={value} options={OPTIONS} onChange={setValue} />
      <output aria-label="chosen">{value}</output>
    </>
  );
}

const field = () => screen.getByRole('combobox', { name: 'פרק ראשי' });
const chosen = () => screen.getByLabelText('chosen').textContent;

describe('ChapterCombobox', () => {
  it('shows the chapter chosen, or "all", when it is closed', () => {
    render(<Harness start="2" />);

    expect(field()).toHaveValue('2 - חשבונאות ממשלתית');
    expect(field()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens on a click with every chapter, "all" first, and marks the one chosen', async () => {
    render(<Harness start="2" />);

    await userEvent.click(field());

    expect(field()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['הכל', '1 - ביצוע תקציב', '2 - חשבונאות ממשלתית', '7 - התקשרויות ורכישות']);
    expect(screen.getByRole('option', { name: /^2 - / })).toHaveAttribute('aria-selected', 'true');
  });

  it('narrows the list to what is typed, by number or by words, ignoring quotes', async () => {
    render(<Harness />);
    await userEvent.click(field());

    await userEvent.keyboard('התקשר');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['7 - התקשרויות ורכישות']);

    await userEvent.clear(field());
    await userEvent.keyboard('2');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['2 - חשבונאות ממשלתית']);
  });

  it('says so when no chapter matches', async () => {
    render(<Harness />);
    await userEvent.click(field());

    await userEvent.keyboard('zzzz');

    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText('לא נמצא פרק מתאים')).toBeInTheDocument();
  });

  it('chooses with a click, and closes', async () => {
    render(<Harness />);
    await userEvent.click(field());

    await userEvent.click(screen.getByRole('option', { name: /^7 - / }));

    expect(chosen()).toBe('7');
    expect(field()).toHaveValue('7 - התקשרויות ורכישות');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('chooses with the arrows and Enter', async () => {
    render(<Harness />);
    field().focus();

    await userEvent.keyboard('{ArrowDown}');
    expect(field()).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(chosen()).toBe('2');
  });

  it('chooses "all" again from the first option', async () => {
    render(<Harness start="1" />);
    await userEvent.click(field());

    await userEvent.click(screen.getByRole('option', { name: 'הכל' }));

    expect(chosen()).toBe('');
    expect(field()).toHaveValue('הכל');
  });

  it('closes on Escape and leaves the choice as it was, whatever was typed', async () => {
    render(<Harness start="1" />);
    await userEvent.click(field());
    await userEvent.keyboard('חשבו');

    await userEvent.keyboard('{Escape}');

    expect(chosen()).toBe('1');
    expect(field()).toHaveValue('1 - ביצוע תקציב');
  });

  it('closes when the focus leaves the field', async () => {
    render(<Harness />);
    await userEvent.click(field());

    await userEvent.tab();

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
