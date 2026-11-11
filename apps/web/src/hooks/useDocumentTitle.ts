import { useEffect } from 'react';
import { messages } from '../i18n/messages';

/** Puts the title of the page in the tab (and gives it back to the app name when the page goes away). */
export function useDocumentTitle(title: string | undefined): void {
  useEffect(() => {
    document.title = title ? `${title} · ${messages.appName}` : messages.appName;
    return () => {
      document.title = messages.appName;
    };
  }, [title]);
}
