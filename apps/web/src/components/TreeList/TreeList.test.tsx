import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { makeDocument } from '../../../tests/support/fixtures';
import { TreeList } from './TreeList';

const inChapter = (codeText: string, main: string, sub: string) =>
  makeDocument({ codeText, title: `מסמך ${codeText}`, mainChapterCode: main, mainChapterTitle: `פרק ${main}`, chapterCode: `${main}.${sub}`, chapterTitle: `תת פרק ${main}.${sub}` });

function renderTree(items: ReturnType<typeof makeDocument>[], selectedCodeText?: string) {
  return render(
    <MemoryRouter>
      <TreeList items={items} total={items.length} selectedCodeText={selectedCodeText} search="" />
    </MemoryRouter>,
  );
}

describe('TreeList', () => {
  it('opens every node when there are one or two chapters', () => {
    renderTree([inChapter('H.1.1.1', '1', '1'), inChapter('H.2.1.1', '2', '1')]);

    expect(screen.getAllByRole('button', { expanded: true }).length).toBeGreaterThanOrEqual(4);
    expect(screen.getByRole('link', { name: /מסמך H\.1\.1\.1/ })).toBeVisible();
    expect(screen.getByRole('link', { name: /מסמך H\.2\.1\.1/ })).toBeVisible();
  });

  it('closes the chapters except the one of the selected document when there are many', () => {
    renderTree([inChapter('H.1.1.1', '1', '1'), inChapter('H.2.1.1', '2', '1'), inChapter('H.3.1.1', '3', '1')], 'H.2.1.1');

    expect(screen.getByRole('button', { name: /^2\s*פרק 2$/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /^1\s*פרק 1$/ })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: /מסמך H\.1\.1\.1/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /מסמך H\.2\.1\.1/ })).toHaveAttribute('aria-current', 'page');
  });

  it('opens and closes a node, and every node with the two buttons', async () => {
    const user = userEvent.setup();
    renderTree([inChapter('H.1.1.1', '1', '1'), inChapter('H.2.1.1', '2', '1'), inChapter('H.3.1.1', '3', '1')]);
    expect(screen.queryByRole('link', { name: /מסמך H\.1\.1\.1/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'הרחבת רשימה' }));
    expect(screen.getAllByRole('link')).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: /^1\s*פרק 1$/ }));
    expect(screen.getAllByRole('link')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'צמצום רשימה' }));

    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('puts a document with no chapter under "no chapter"', () => {
    renderTree([makeDocument({ codeText: 'T.9.9.9', title: 'טופס יתום', mainChapterCode: null, mainChapterTitle: null, chapterCode: null, chapterTitle: null })]);

    expect(screen.getAllByRole('button', { name: 'ללא פרק' })).toHaveLength(2);
    expect(screen.getByRole('link', { name: /טופס יתום/ })).toHaveAttribute('href', '/documents/T.9.9.9');
  });

  it('keeps the filters on every link', () => {
    render(
      <MemoryRouter>
        <TreeList items={[inChapter('H.1.1.1', '1', '1')]} total={1} selectedCodeText={undefined} search="?type=all" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /מסמך H\.1\.1\.1/ })).toHaveAttribute('href', '/documents/H.1.1.1?type=all');
  });
});
