import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import { screen } from '@testing-library/react';

import { getInstanceDataStateMock } from 'src/__mocks__/instanceDataStateMock';
import { partyMock } from 'src/__mocks__/partyMock';
import { Confirm } from 'src/features/confirm/containers/Confirm';
import { renderWithProviders } from 'src/testUtils';

describe('Confirm', () => {
  it('should show spinner when loading required data', () => {
    renderWithProviders(
      <MemoryRouter>
        <Confirm />
      </MemoryRouter>,
    );
    const title = screen.queryByText('Se over svarene dine før du sender inn');
    expect(title).not.toBeInTheDocument();

    const contentLoader = screen.getByText('Loading...');
    expect(contentLoader).toBeInTheDocument();
  });
  it('should not show loading if required data is loaded', () => {
    renderWithProviders(
      <MemoryRouter>
        <Confirm />
      </MemoryRouter>,
      {
        preloadedState: {
          instanceData: getInstanceDataStateMock(),
          party: {
            parties: [partyMock],
            selectedParty: partyMock,
            error: null,
          },
        },
      },
    );
    const contentLoader = screen.queryByText('Loading...');
    expect(contentLoader).not.toBeInTheDocument();
  });
});
