import React from 'react';

import { render, screen } from '@testing-library/react';
import { PartySelectionPage } from 'nextsrc/features/instantiate/pages/party-selection/PartySelectionPage';

describe('PartySelectionPage', () => {
  it('should render the party selection heading', () => {
    render(<PartySelectionPage />);
    expect(screen.getByRole('heading', { name: 'Party selection' })).toBeInTheDocument();
  });
});
