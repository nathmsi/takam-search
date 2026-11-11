import { describe, expect, it } from 'vitest';
import { buildDocumentsQuery } from './build-documents-query';

describe('buildDocumentsQuery', () => {
  it('leaves out what is empty, and asks for every kind of document when none is chosen', () => {
    expect(buildDocumentsQuery({ q: '', chapter: '', type: 'all', inForce: 'all' })).toBe('limit=1000');
  });

  it('writes every filter that is set, with the words trimmed and encoded', () => {
    const query = new URLSearchParams(buildDocumentsQuery({ q: '  קופות ביטחון ', chapter: '1.4', type: 'Instruction', inForce: 'yes' }));

    expect(query.get('q')).toBe('קופות ביטחון');
    expect(query.get('chapter')).toBe('1.4');
    expect(query.get('type')).toBe('Instruction');
    expect(query.get('inForce')).toBe('yes');
  });

  it('does not send blank words', () => {
    expect(new URLSearchParams(buildDocumentsQuery({ q: '   ', chapter: '', type: 'Form', inForce: 'no' })).has('q')).toBe(false);
  });
});
