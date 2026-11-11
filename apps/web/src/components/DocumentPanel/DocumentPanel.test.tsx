import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { DOCUMENTS } from '../../../tests/support/fixtures';
import { DocumentPanel } from './DocumentPanel';

const withRelated = (related = [] as Parameters<typeof DocumentPanel>[0]['document']['related']) => ({ ...DOCUMENTS.payments, related });
const message = (codeText: string, title: string, validFrom: string, validTo: string | null) => ({ codeText, title, type: 'Message' as const, validFrom, validTo, isInForce: validTo === null, fileUrl: `/v1/documents/${codeText}/file` });
const show = (document: ReturnType<typeof withRelated>) => render(<MemoryRouter><DocumentPanel document={document} search="?q=x" /></MemoryRouter>);

describe('DocumentPanel, the links', () => {
  it('links to the file of the document, through the API, in a new tab', () => {
    show(withRelated());

    const link = screen.getByRole('link', { name: 'הורדת קובץ ההוראה' });
    expect(link).toHaveAttribute('href', '/v1/documents/H.1.4.3/file');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('still links to the page of the document on the official site', () => {
    show(withRelated());

    expect(screen.getByRole('link', { name: /לדף ההוראה באתר תכ"ם/ })).toHaveAttribute('href', 'https://takam.mof.gov.il/document/H.1.4.3');
  });

  it('lists the attached messages with their dates, a link to each and a link to its file', () => {
    show(withRelated([message('HOD.1.2.2.1', 'הנחיות לשנת 2020', '2020-09-29', '2020-12-31'), message('HOD.1.2.2.5', 'הנחיות לשנת 2026', '2026-03-01', null)]));

    const section = screen.getByRole('region', { name: 'הודעות' });
    expect(within(section).getAllByRole('listitem')).toHaveLength(2);
    expect(within(section).getByRole('link', { name: 'הנחיות לשנת 2020' })).toHaveAttribute('href', '/documents/HOD.1.2.2.1?q=x');
    expect(within(section).getByRole('link', { name: 'הורדת הקובץ: הנחיות לשנת 2020' })).toHaveAttribute('href', '/v1/documents/HOD.1.2.2.1/file');
    expect(within(section).getAllByText('תחילת תוקף')).toHaveLength(2);
  });

  it('shows no section for a document that has nothing attached', () => {
    show(withRelated());

    expect(screen.queryByRole('region', { name: 'הודעות' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'טפסים' })).not.toBeInTheDocument();
  });
});
