const FORMATTER: Intl.DateTimeFormat = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** An ISO date (`2026-05-06`) as a Hebrew date (`6 במאי 2026`); anything that is not a date comes back as it was. */
export function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? iso : FORMATTER.format(date);
}
