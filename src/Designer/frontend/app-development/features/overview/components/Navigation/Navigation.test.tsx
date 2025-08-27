import React from 'react';
import { screen } from '@testing-library/react';
import { Navigation } from './Navigation';
import {
  getFilteredMenuListForOverviewPage,
  topBarMenuItem,
} from '../../../../utils/headerMenu/headerMenuUtils';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../../test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { typedLocalStorage } from 'libs/studio-pure-functions/src';
import { type HeaderMenuItem } from '../../../../types/HeaderMenu/HeaderMenuItem';

describe('Navigation', () => {
  beforeEach(() => {
    typedLocalStorage.removeItem('featureFlags');
  });
  it('renders component', async () => {
    renderWithProviders(<Navigation />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app`,
    });

    getFilteredMenuListForOverviewPage().forEach((link) => {
      expect(screen.getByRole('link', { name: textMock(link.key) })).toBeInTheDocument();
    });
  });

  it('only renders menu items that are not hidden by featureFlags', async () => {
    renderWithProviders(<Navigation />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app`,
    });

    getFilteredMenuListForOverviewPage().forEach((link) => {
      if (link.featureFlagName) {
        expect(screen.queryByRole('link', { name: textMock(link.key) })).not.toBeInTheDocument();
      } else {
        expect(screen.getByRole('link', { name: textMock(link.key) })).toBeInTheDocument();
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
      expect(screen.getByRole('link', { name: textMock(link.key) })).toBeInTheDocument();
    });
  });

  it('renders menu items that are tagged as beta, with isBeta class', () => {
    const betaItems = topBarMenuItem.filter((item) => !!item.isBeta);

    // ensure any feature flags are toggled on
    typedLocalStorage.setItem('featureFlags', getFeatureFlags(betaItems));

    renderWithProviders(<Navigation />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app`,
    });

    betaItems.forEach((link) => {
      expect(screen.getByRole('link', { name: textMock(link.key) })).toHaveClass('isBeta');
    });
  });

  it('renders menu items that are not tagged as beta, without isBeta class', () => {
    const menuItemsNotBeta = getFilteredMenuListForOverviewPage().filter((item) => !item.isBeta);

    // ensure any feature flags are toggled on
    typedLocalStorage.setItem('featureFlags', getFeatureFlags(menuItemsNotBeta));

    renderWithProviders(<Navigation />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app`,
    });

    menuItemsNotBeta.forEach((link) => {
      expect(screen.getByRole('link', { name: textMock(link.key) })).not.toHaveClass('isBeta');
    });
  });
});

const getFeatureFlags = (menuItems: HeaderMenuItem[]) => {
  return menuItems.filter((item) => !!item.featureFlagName).map((item) => item.featureFlagName);
};
