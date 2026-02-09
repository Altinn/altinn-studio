import React from 'react';

import { render, screen } from '@testing-library/react';
import { InstancePage } from 'nextsrc/features/instantiate/pages/instance/InstancePage';

describe('InstancePage', () => {
  it('should render the instance heading', () => {
    render(<InstancePage />);
    expect(screen.getByRole('heading', { name: 'Instance' })).toBeInTheDocument();
  });
});
