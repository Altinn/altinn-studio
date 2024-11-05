import React from 'react';
import { screen } from '@testing-library/react';
import { Navigation } from './Navigation';
import {
  getFilteredMenuListForOverviewPage,
  topBarMenuItem,
} from 'app-development/utils/headerMenu/headerMenuUtils';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from 'app-development/test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { typedLocalStorage } from '@studio-pure-functions';
import { type HeaderMenuItem } from 'app-development/types/HeaderMenu/HeaderMenuItem';

describe('Navigation', () => {
  beforeEach(() => {
    typedLocalStorage.removeItem('featureFlags');
  });
  it('renders component', async () => {
    renderWithProviders(<Navigation />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app`,
    });

    getFilteredMenuListForOverviewPage().forEach((link) => {
      expect(screen.getByRole('link', { name: getLinkName(link) })).toBeInTheDocument();
    });
  });

  it('only renders menu items that are not hidden by featureFlags', async () => {
    renderWithProviders(<Navigation />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app`,
    });

    getFilteredMenuListForOverviewPage().forEach((link) => {
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

    getFilteredMenuListForOverviewPage().forEach((link) => {
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
      expect(screen.getByRole('link', { name: `${textMock(link.key)} Beta` })).toBeInTheDocument();
    });
  });
});

const getLinkName = (linkItem: HeaderMenuItem): string => {
  let name = textMock(linkItem.key);
  if (linkItem.isBeta) {
    name = `${name} Beta`;
  }
  return name;
};

const getFeatureFlags = (menuItems: HeaderMenuItem[]) => {
  return menuItems.filter((item) => !!item.featureFlagName).map((item) => item.featureFlagName);
};
