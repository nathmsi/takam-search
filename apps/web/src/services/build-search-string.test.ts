import { describe, expect, it } from 'vitest';
import { buildSearchString } from './build-search-string';

describe('buildSearchString', () => {
  it('is empty when nothing is chosen (the default kind of document is not written)', () => {
    expect(buildSearchString({ q: '', chapter: '', type: 'Instruction', inForce: 'all' })).toBe('');
  });

  it('writes what is chosen, encoded, after a question mark', () => {
    const search = buildSearchString({ q: 'קופות ביטחון', chapter: '1.4', type: 'all', inForce: 'yes' });

    const params = new URLSearchParams(search);
    expect(search.startsWith('?')).toBe(true);
    expect([params.get('q'), params.get('chapter'), params.get('type'), params.get('inForce')]).toEqual(['קופות ביטחון', '1.4', 'all', 'yes']);
  });

  it('does not write blank words', () => {
    expect(buildSearchString({ q: '   ', chapter: '', type: 'Instruction', inForce: 'all' })).toBe('');
  });
});
