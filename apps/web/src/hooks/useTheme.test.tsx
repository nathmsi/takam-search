import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { THEME_STORAGE_KEY, useTheme } from './useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = 'light';
    localStorage.clear();
  });
  afterEach(() => {
    delete document.documentElement.dataset.theme;
    localStorage.clear();
  });

  it('starts with the theme the page already has (light by default)', () => {
    expect(renderHook(() => useTheme()).result.current.theme).toBe('light');
  });

  it('starts dark when the page was set dark before the first paint', () => {
    document.documentElement.dataset.theme = 'dark';

    expect(renderHook(() => useTheme()).result.current.theme).toBe('dark');
  });

  it('switches the page and remembers the choice', () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.toggleTheme());

    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    act(() => result.current.toggleTheme());
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });
});
