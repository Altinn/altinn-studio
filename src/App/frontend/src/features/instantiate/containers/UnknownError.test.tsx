import React from 'react';

import { jest } from '@jest/globals';
import { screen } from '@testing-library/react';

import { UnknownError } from 'src/features/instantiate/containers/UnknownError';
import { renderWithMinimalProviders } from 'src/test/renderWithProviders';

describe('Unknown error', () => {
  it('should be able to render with minimal providers', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await renderWithMinimalProviders({
      renderer: () => <UnknownError />,
    });

    expect(screen.getByTestId('StatusCode')).toBeInTheDocument();
    expect(screen.getByTestId('StatusCode')).toHaveTextContent('Ukjent feil');
    expect(screen.getByTestId('AltinnError')).toHaveTextContent(
      'Det har skjedd en ukjent feil, vennligst prøv igjen senere.',
    );

    expect(console.error).not.toHaveBeenCalled();
  });
});
