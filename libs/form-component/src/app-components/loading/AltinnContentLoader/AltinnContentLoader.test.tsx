import React from 'react';

import { render, screen } from '@testing-library/react';

import { AltinnContentLoader, type IAltinnContentLoaderProps } from './AltinnContentLoader';

const renderLoader = (props: Omit<IAltinnContentLoaderProps, 'reason'> = {}) => {
  render(<AltinnContentLoader reason='testing' {...props} />);
};

describe('AltinnContentLoader', () => {
  it('should show default loader when no variant is set', () => {
    renderLoader();

    expect(screen.getByTestId('AltinnContentIcon')).toBeInTheDocument();
    expect(screen.queryByTestId('AltinnContentIconFormData')).not.toBeInTheDocument();
    expect(screen.queryByTestId('AltinnContentIconReceipt')).not.toBeInTheDocument();
  });

  it('should show form loader when variant=form', () => {
    renderLoader({ variant: 'form' });

    expect(screen.queryByTestId('AltinnContentIconFormData')).toBeInTheDocument();
    expect(screen.queryByTestId('AltinnContentIconReceipt')).not.toBeInTheDocument();
    expect(screen.queryByTestId('AltinnContentIcon')).not.toBeInTheDocument();
  });

  it('should show receipt loader when variant=receipt', () => {
    renderLoader({ variant: 'receipt' });

    expect(screen.queryByTestId('AltinnContentIconReceipt')).toBeInTheDocument();
    expect(screen.queryByTestId('AltinnContentIconFormData')).not.toBeInTheDocument();
    expect(screen.queryByTestId('AltinnContentIcon')).not.toBeInTheDocument();
  });
});
