import { describe, expect, it } from 'vitest';
import { parseInForceFilter } from './parse-in-force-filter';

describe('parseInForceFilter', () => {
  it('keeps yes and no', () => {
    expect(parseInForceFilter('yes')).toBe('yes');
    expect(parseInForceFilter('no')).toBe('no');
  });

  it('reads anything else, or nothing, as all', () => {
    expect(parseInForceFilter('maybe')).toBe('all');
    expect(parseInForceFilter('')).toBe('all');
    expect(parseInForceFilter(null)).toBe('all');
  });
});
