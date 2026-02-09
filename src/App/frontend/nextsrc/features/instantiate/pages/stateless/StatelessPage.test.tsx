import React from 'react';

import { render, screen } from '@testing-library/react';
import { StatelessPage } from 'nextsrc/features/instantiate/pages/stateless/StatelessPage';

describe('StatelessPage', () => {
  it('should render the stateless heading', () => {
    render(<StatelessPage />);
    expect(screen.getByRole('heading', { name: 'Stateless' })).toBeInTheDocument();
  });
});
