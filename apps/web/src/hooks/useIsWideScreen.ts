import { useSyncExternalStore } from 'react';

/** The width where the list and the document sit side by side (the same as the media query of `BrowsePage.module.css`). */
const WIDE_SCREEN = '(min-width: 62rem)';

function subscribe(onChange: () => void): () => void {
  const query: MediaQueryList | undefined = window.matchMedia?.(WIDE_SCREEN);
  query?.addEventListener('change', onChange);
  return () => query?.removeEventListener('change', onChange);
}

const isWide = (): boolean => window.matchMedia?.(WIDE_SCREEN).matches ?? false;

/** `true` when the screen is wide enough to show the list and the selected document together. */
export function useIsWideScreen(): boolean {
  return useSyncExternalStore(subscribe, isWide, () => false);
}
