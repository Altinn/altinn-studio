import React from 'react';
import { screen } from '@testing-library/react';
import { Navigation } from './Navigation';
import {
  getFilteredMenuListForOverviewPage,
  topBarMenuItems,
} from 'app-development/utils/headerMenu/headerMenuUtils';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from 'app-development/test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { FeatureFlagsContextProvider, type FeatureFlag } from '@studio/feature-flags';
import { type HeaderMenuItem } from 'app-development/types/HeaderMenu/HeaderMenuItem';

describe('Navigation', () => {
  it('renders component', async () => {
    renderNavigation();

    getFilteredMenuListForOverviewPage([]).forEach((link) => {
      expect(screen.getByRole('link', { name: textMock(link.key) })).toBeInTheDocument();
    });
  });

  it('only renders menu items that are not hidden by featureFlags', async () => {
    renderNavigation();

    getFilteredMenuListForOverviewPage([]).forEach((link) => {
      if (link.featureFlagName) {
        expect(screen.queryByRole('link', { name: textMock(link.key) })).not.toBeInTheDocument();
      } else {
        expect(screen.getByRole('link', { name: textMock(link.key) })).toBeInTheDocument();
      }
    });
  });

  it('only renders menu items that are hidden by featureFlags if the feature flag is toggled on', async () => {
    const featureFlags = getFeatureFlags(topBarMenuItems);
    renderNavigation(featureFlags);

    getFilteredMenuListForOverviewPage(featureFlags).forEach((link) => {
      expect(screen.getByRole('link', { name: textMock(link.key) })).toBeInTheDocument();
    });
  });

  it('renders menu items that are tagged as beta, with isBeta class', () => {
    const betaItems = topBarMenuItems.filter((item) => !!item.isBeta);
    const featureFlags = getFeatureFlags(betaItems);

    renderNavigation(featureFlags);

    betaItems.forEach((link) => {
      expect(screen.getByRole('link', { name: textMock(link.key) })).toHaveClass('isBeta');
    });
  });

  it('renders menu items that are not tagged as beta, without isBeta class', () => {
    const menuItemsNotBeta = getFilteredMenuListForOverviewPage([]).filter((item) => !item.isBeta);

    renderNavigation();

    menuItemsNotBeta.forEach((link) => {
      expect(screen.getByRole('link', { name: textMock(link.key) })).not.toHaveClass('isBeta');
    });
  });
});

const getFeatureFlags = (menuItems: HeaderMenuItem[]): FeatureFlag[] => {
  return menuItems.filter((item) => !!item.featureFlagName).map((item) => item.featureFlagName);
};

const renderNavigation = (featureFlags: FeatureFlag[] = []) => {
  renderWithProviders(
    <FeatureFlagsContextProvider value={{ flags: featureFlags }}>
      <Navigation />
    </FeatureFlagsContextProvider>,
    {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app`,
    },
  );
};
