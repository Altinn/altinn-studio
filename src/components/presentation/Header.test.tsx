import React from 'react';

import { screen } from '@testing-library/react';

import { Header } from 'src/components/presentation/Header';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';

describe('Header', () => {
  it('should render as expected with header title', async () => {
    await renderWithInstanceAndLayout({
      renderer: () => <Header header='Test Header' />,
    });
    expect(screen.getByRole('banner')).toHaveTextContent('Test Header');
  });
});
