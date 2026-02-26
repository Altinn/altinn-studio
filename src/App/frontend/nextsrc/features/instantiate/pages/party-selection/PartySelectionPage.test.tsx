import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { PartySelectionPage } from 'nextsrc/features/instantiate/pages/party-selection/PartySelectionPage';

describe('PartySelectionPage', () => {
  it('should render the instantiate header', () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PartySelectionPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByTestId('InstantiateHeader')).toBeInTheDocument();
  });
});
