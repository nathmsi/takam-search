import { describe, expect, it } from 'vitest';
import { parseTypeFilter } from './parse-type-filter';

describe('parseTypeFilter', () => {
  it('keeps "all" and the known kinds of document', () => {
    expect(parseTypeFilter('all')).toBe('all');
    expect(parseTypeFilter('Form')).toBe('Form');
    expect(parseTypeFilter('Temporary Instruction')).toBe('Temporary Instruction');
  });

  it('reads nothing, or anything else, as the instructions', () => {
    expect(parseTypeFilter(null)).toBe('Instruction');
    expect(parseTypeFilter('')).toBe('Instruction');
    expect(parseTypeFilter('Poem')).toBe('Instruction');
  });
});
