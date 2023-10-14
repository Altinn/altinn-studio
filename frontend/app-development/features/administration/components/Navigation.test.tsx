import React from 'react';
import { render, screen } from '@testing-library/react';
import { Navigation } from './Navigation';
import { TopBarMenu, menu } from 'app-development/layout/AppBar/appBarConfig';
import { textMock } from '../../../../testing/mocks/i18nMock';

describe('Navigation', () => {
  it('renders component', async () => {
    render(<Navigation />);

    menu
      .filter((item) => item.key !== TopBarMenu.About)
      .forEach((link) => {
        expect(screen.getByRole('link', { name: textMock(link.key) })).toBeInTheDocument();
      });
  });
});
