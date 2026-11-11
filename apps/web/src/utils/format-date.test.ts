import { describe, expect, it } from 'vitest';
import { formatDate } from './format-date';

describe('formatDate', () => {
  it('writes an ISO date in Hebrew', () => {
    expect(formatDate('2026-05-06')).toBe('6 במאי 2026');
  });

  it('does not shift the day with the time zone of the machine', () => {
    expect(formatDate('2026-01-01')).toBe('1 בינואר 2026');
  });

  it('gives back what is not a date', () => {
    expect(formatDate('not a date')).toBe('not a date');
  });
});
