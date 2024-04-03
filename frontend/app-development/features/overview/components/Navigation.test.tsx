import React from 'react';
import { screen } from '@testing-library/react';
import { Navigation } from './Navigation';
import { getFilteredTopBarMenu, topBarMenuItem } from 'app-development/layout/AppBar/appBarConfig';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { renderWithProviders } from 'app-development/test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { TopBarMenu } from 'app-shared/enums/TopBarMenu';
import { RepositoryType } from 'app-shared/types/global';
import { typedLocalStorage } from 'app-shared/utils/webStorage';
import type { TopBarMenuItem } from 'app-shared/types/TopBarMenuItem';

describe('Navigation', () => {
  beforeEach(() => {
    typedLocalStorage.removeItem('featureFlags');
  });
  it('renders component', async () => {
    renderWithProviders(<Navigation />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app`,
    });

    getFilteredTopBarMenu(RepositoryType.App)
      .filter((item) => item.key !== TopBarMenu.About)
      .forEach((link) => {
        expect(screen.getByRole('link', { name: getLinkName(link) })).toBeInTheDocument();
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
          expect(screen.queryByRole('link', { name: getLinkName(link) })).not.toBeInTheDocument();
        } else {
          expect(screen.getByRole('link', { name: getLinkName(link) })).toBeInTheDocument();
        }
      });
  });

  it('only renders menu items that are hidden by featureFlags if the feature flag is toggled on', async () => {
    // ensure any feature flags are toggled on
    typedLocalStorage.setItem('featureFlags', getFeatureFlags(topBarMenuItem));
    renderWithProviders(<Navigation />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app`,
    });

    topBarMenuItem
      .filter((item) => item.key !== TopBarMenu.About)
      .forEach((link) => {
        expect(screen.getByRole('link', { name: getLinkName(link) })).toBeInTheDocument();
      });
  });

  it('renders "beta" tag for menu items that are tagges as beta', () => {
    const betaItems = topBarMenuItem.filter((item) => !!item.isBeta);

    // ensure any feature flags are toggled on
    typedLocalStorage.setItem('featureFlags', getFeatureFlags(betaItems));

    renderWithProviders(<Navigation />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app`,
    });

    betaItems.forEach((link) => {
      expect(
        screen.getByRole('link', { name: `${textMock(link.key)} ${textMock('general.beta')}` }),
      ).toBeInTheDocument();
    });
  });
});

const getLinkName = (linkItem: TopBarMenuItem): string => {
  let name = textMock(linkItem.key);
  if (linkItem.isBeta) {
    name = `${name} ${textMock('general.beta')}`;
  }
  return name;
};

const getFeatureFlags = (menuItems: TopBarMenuItem[]) => {
  return menuItems.filter((item) => !!item.featureFlagName).map((item) => item.featureFlagName);
};
