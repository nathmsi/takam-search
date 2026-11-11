import { describe, expect, it } from 'vitest';
import { buildDocumentsQuery } from './build-documents-query';

describe('buildDocumentsQuery', () => {
  it('leaves out what is empty, and asks for every kind of document when none is chosen', () => {
    expect(buildDocumentsQuery({ q: '', chapter: '', type: 'all', inForce: 'all', meaning: false })).toBe('limit=1000');
  });

  it('writes every filter that is set, with the words trimmed and encoded', () => {
    const query = new URLSearchParams(buildDocumentsQuery({ q: '  קופות ביטחון ', chapter: '1.4', type: 'Instruction', inForce: 'yes', meaning: false }));

    expect(query.get('q')).toBe('קופות ביטחון');
    expect(query.get('chapter')).toBe('1.4');
    expect(query.get('type')).toBe('Instruction');
    expect(query.get('inForce')).toBe('yes');
  });

  it('asks for the search by meaning only when it is ticked and there are words', () => {
    expect(new URLSearchParams(buildDocumentsQuery({ q: 'שילמו באיחור', chapter: '', type: 'all', inForce: 'all', meaning: true })).get('meaning')).toBe('yes');
    expect(new URLSearchParams(buildDocumentsQuery({ q: '', chapter: '', type: 'all', inForce: 'all', meaning: true })).has('meaning')).toBe(false);
    expect(new URLSearchParams(buildDocumentsQuery({ q: 'שילמו', chapter: '', type: 'all', inForce: 'all', meaning: false })).has('meaning')).toBe(false);
  });

  it('does not send blank words', () => {
    expect(new URLSearchParams(buildDocumentsQuery({ q: '   ', chapter: '', type: 'Form', inForce: 'no', meaning: false })).has('q')).toBe(false);
  });
});
