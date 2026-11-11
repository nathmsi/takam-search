/** Today's date in Israel as `YYYY-MM-DD` (the documents are dated there, and midnight in UTC is not midnight in Israel). */
export function israelToday(): string {
  // The "sv-SE" locale writes dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jerusalem' }).format(new Date());
}
