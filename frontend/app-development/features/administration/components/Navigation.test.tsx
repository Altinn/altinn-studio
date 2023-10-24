import React from 'react';
import { screen } from '@testing-library/react';
import { Navigation } from './Navigation';
import { TopBarMenu, menu } from 'app-development/layout/AppBar/appBarConfig';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { renderWithProviders } from 'app-development/test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';

describe('Navigation', () => {
  it('renders component', async () => {
    renderWithProviders(<Navigation />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app`,
    });

    menu
      .filter((item) => item.key !== TopBarMenu.About)
      .forEach((link) => {
        expect(screen.getByRole('link', { name: textMock(link.key) })).toBeInTheDocument();
      });
  });
});
