import React from 'react';

import { jest } from '@jest/globals';
import { screen } from '@testing-library/react';

import { Loader } from 'src/core/loading/Loader';
import { renderWithMinimalProviders } from 'src/test/renderWithProviders';

describe('Loader', () => {
  it('should be able to render with minimal providers', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await renderWithMinimalProviders({
      renderer: () => <Loader reason='testing-reason' />,
      waitUntilLoaded: false,
    });

    expect(screen.getByTestId('loader')).toBeInTheDocument();
    expect(screen.getByTestId('loader')).toHaveAttribute('data-reason', 'testing-reason');
    expect(console.error).not.toHaveBeenCalled();
  });
});
