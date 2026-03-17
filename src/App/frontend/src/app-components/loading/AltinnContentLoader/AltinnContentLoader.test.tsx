import React from 'react';

import { screen } from '@testing-library/react';

import {
  AltinnContentLoader,
  IAltinnContentLoaderProps,
} from 'src/app-components/loading/AltinnContentLoader/AltinnContentLoader';
import { renderWithAppComponentsProvider } from 'src/app-components/test/renderWithAppComponentsProvider';

const render = (props: Omit<IAltinnContentLoaderProps, 'reason'> = {}) => {
  const allProps = {
    ...props,
  };

  renderWithAppComponentsProvider(
    <AltinnContentLoader
      reason='testing'
      {...allProps}
    />,
  );
};

describe('AltinnContentLoader', () => {
  it('should show default loader when no variant is set', () => {
    render();

    expect(screen.getByTestId('AltinnContentIcon')).toBeInTheDocument();
    expect(screen.queryByTestId('AltinnContentIconFormData')).not.toBeInTheDocument();
    expect(screen.queryByTestId('AltinnContentIconReceipt')).not.toBeInTheDocument();
  });

  it('should show form loader when variant=form', () => {
    render({ variant: 'form' });

    expect(screen.queryByTestId('AltinnContentIconFormData')).toBeInTheDocument();
    expect(screen.queryByTestId('AltinnContentIconReceipt')).not.toBeInTheDocument();
    expect(screen.queryByTestId('AltinnContentIcon')).not.toBeInTheDocument();
  });

  it('should show receipt loader when variant=receipt', () => {
    render({ variant: 'receipt' });

    expect(screen.queryByTestId('AltinnContentIconReceipt')).toBeInTheDocument();
    expect(screen.queryByTestId('AltinnContentIconFormData')).not.toBeInTheDocument();
    expect(screen.queryByTestId('AltinnContentIcon')).not.toBeInTheDocument();
  });
});
