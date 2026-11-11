import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { installFakeApi } from '../../tests/support/fake-api';
import { DOCUMENTS } from '../../tests/support/fixtures';
import { renderApp } from '../../tests/support/render-app';

describe('NotFoundPage', () => {
  it('answers an unknown address and leads back to the search', async () => {
    installFakeApi({ documents: [DOCUMENTS.budget] });
    const { user } = renderApp('/no/such/page');

    expect(screen.getByText('העמוד לא נמצא')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'חזרה לחיפוש' }));

    expect(await screen.findByRole('searchbox')).toBeInTheDocument();
  });
});
