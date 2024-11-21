import React from 'react';

import { screen, waitFor } from '@testing-library/react';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';

describe('tests to make sure to follow accessibility requirements', () => {
  test('should have role progressbar', async () => {
    await renderWithoutInstanceAndLayout({ renderer: () => <AltinnSpinner />, waitUntilLoaded: false });
    await waitFor(() => {
      expect(screen.getByRole('progressbar'));
    });
  });

  test('should have role alert on spinner text to make sure screen readers is focus the text content', async () => {
    await renderWithoutInstanceAndLayout({
      renderer: () => <AltinnSpinner spinnerText='Loading form' />,
      waitUntilLoaded: false,
    });
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Loading form');
    });

    expect(screen.getByRole('alert')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Loading form');
  });

  test('should fallback spinnerText to "Laster innhold", but hidden from visual view to stay accessible"', async () => {
    await renderWithoutInstanceAndLayout({ renderer: () => <AltinnSpinner />, waitUntilLoaded: false });

    await waitFor(
      () => {
        expect(screen.getByRole('alert', { name: 'Laster innhold' })).toBeInTheDocument();
      },
      { timeout: 15000 },
    );

    const spinnerText = screen.getByRole('alert', { name: 'Laster innhold' });
    expect(spinnerText).toHaveTextContent('');
  });
});
