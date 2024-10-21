import React from 'react';
import { render, screen } from '@testing-library/react';
import type { StudioAlertProps } from './StudioAlert';
import { StudioAlert } from './StudioAlert';

describe('StudioAlert', () => {
  it('should render the component', () => {
    renderTestAlert({ severity: 'danger' });
    const studioAlert = screen.getByText('Feil');
    expect(studioAlert).toBeInTheDocument();
  });
});

const renderTestAlert = (props: Partial<StudioAlertProps> = {}) => {
  render(<StudioAlert {...props} />);
};
