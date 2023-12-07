import React from 'react';

import { screen } from '@testing-library/react';

import { getPartyMock } from 'src/__mocks__/getPartyMock';
import { Confirm } from 'src/features/processEnd/confirm/containers/Confirm';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';

describe('Confirm', () => {
  it('should not show loading if required data is loaded', async () => {
    await renderWithInstanceAndLayout({
      renderer: () => <Confirm />,
      queries: {
        fetchParties: () => Promise.resolve([getPartyMock()]),
        fetchCurrentParty: () => Promise.resolve(getPartyMock()),
      },
    });
    const contentLoader = screen.queryByText('Loading...');
    expect(contentLoader).not.toBeInTheDocument();
  });
});
