import { checkSiteData } from './check-site-data';

const documents = (count: number): object[] => Array.from({ length: count }, (_, index) => ({ documentcodetext: `H.1.${index}` }));
const chapters = (count: number): object[] => Array.from({ length: count }, (_, index) => ({ id: index }));

describe('checkSiteData', () => {
  it('accepts data like the site gives today', () => {
    expect(checkSiteData({ documents: documents(922), chapters: chapters(114) })).toEqual([]);
  });

  it('refuses an answer that is not a list (an error page)', () => {
    expect(checkSiteData({ documents: { error: 'down' }, chapters: chapters(114) })).toEqual(['Document is not a list']);
    expect(checkSiteData({ documents: documents(922), chapters: 'oops' })).toEqual(['Chapter is not a list']);
  });

  it('refuses documents that lost their code, or far fewer chapters', () => {
    expect(checkSiteData({ documents: [{ title: 'x' }, ...documents(10)], chapters: chapters(3) })).toHaveLength(2);
  });
});
