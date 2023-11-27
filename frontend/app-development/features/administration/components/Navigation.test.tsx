import React from 'react';
import { screen } from '@testing-library/react';
import { Navigation } from './Navigation';
import { getFilteredTopBarMenu, topBarMenuItem } from 'app-development/layout/AppBar/appBarConfig';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { renderWithProviders } from 'app-development/test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { TopBarMenu } from 'app-shared/enums/TopBarMenu';
import { RepositoryType } from 'app-shared/types/global';

describe('Navigation', () => {
  it('renders component', async () => {
    renderWithProviders(<Navigation />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app`,
    });

    getFilteredTopBarMenu(RepositoryType.App)
      .filter((item) => item.key !== TopBarMenu.About)
      .forEach((link) => {
        expect(screen.getByRole('link', { name: textMock(link.key) })).toBeInTheDocument();
      });
  });

  it('only renders menu items that are not hidden by featureFlags', async () => {
    renderWithProviders(<Navigation />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app`,
    });

    topBarMenuItem
      .filter((item) => item.key !== TopBarMenu.About)
      .forEach((link) => {
        if (link.featureFlagName) {
          expect(screen.queryByRole('link', { name: textMock(link.key) })).not.toBeInTheDocument();
        } else {
          expect(screen.getByRole('link', { name: textMock(link.key) })).toBeInTheDocument();
        }
      });
  });
});
