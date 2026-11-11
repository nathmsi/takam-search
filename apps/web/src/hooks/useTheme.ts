import { useState } from 'react';

/** The two themes. Light is the default; the choice is kept in this browser only. */
export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'takam-theme';

/** The theme `index.html` put on the page before the first paint. */
function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/** The current theme and a function that switches to the other one, on the page and in this browser's storage. */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(currentTheme);
  const toggleTheme = (): void => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be blocked (private window): the theme still changes for this visit.
    }
    setTheme(next);
  };
  return { theme, toggleTheme };
}
