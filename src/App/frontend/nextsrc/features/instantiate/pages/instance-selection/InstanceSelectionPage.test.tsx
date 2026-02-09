import React from 'react';

import { render, screen } from '@testing-library/react';
import { InstanceSelectionPage } from 'nextsrc/features/instantiate/pages/instance-selection/InstanceSelectionPage';

describe('InstanceSelectionPage', () => {
  it('should render the instance selection heading', () => {
    render(<InstanceSelectionPage />);
    expect(screen.getByRole('heading', { name: 'Instance selection' })).toBeInTheDocument();
  });
});
