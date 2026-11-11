import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDocumentTitle } from './useDocumentTitle';

describe('useDocumentTitle', () => {
  it('puts the page title before the app name, and gives the app name back when the page goes away', () => {
    const { unmount } = renderHook(() => useDocumentTitle('1.2.1 ביצוע תקציב המדינה'));
    expect(document.title).toBe('1.2.1 ביצוע תקציב המדינה · חיפוש הוראות תכ"ם');

    unmount();

    expect(document.title).toBe('חיפוש הוראות תכ"ם');
  });

  it('is the app name alone without a title', () => {
    renderHook(() => useDocumentTitle(undefined));

    expect(document.title).toBe('חיפוש הוראות תכ"ם');
  });
});
