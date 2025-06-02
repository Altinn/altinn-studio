import React from 'react';
import { screen } from '@testing-library/react';
import { TabsContent } from './TabsContent';
import { renderWithProviders } from 'app-development/test/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { typedLocalStorage } from '@studio/pure-functions';
import { addFeatureFlagToLocalStorage, FeatureFlag } from 'app-shared/utils/featureToggleUtils';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { SettingsTabId } from '../../types/SettingsTabId';
import { useCurrentSettingsTab } from '../../hooks/useCurrentSettingsTab';
import type { SettingsPageTabId } from 'app-development/types/SettingsPageTabId';

jest.mock('../../hooks/useCurrentSettingsTab');

describe('TabsContent', () => {
  afterEach(() => {
    jest.clearAllMocks();
    typedLocalStorage.removeItem('featureFlags');
  });

  it('should render About tab content when tabToDisplay is "about"', () => {
    const setTabToDisplay = jest.fn();
    const aboutTab: SettingsPageTabId = 'about';
    (useCurrentSettingsTab as jest.Mock).mockReturnValue({
      tabToDisplay: aboutTab,
      setTabToDisplay,
    });
    renderTabsContent();
    expect(getHeading(aboutTab)).toBeInTheDocument();
  });

  it('should render Setup tab content when tabToDisplay is "setup"', () => {
    const setTabToDisplay = jest.fn();
    const setupTab: SettingsPageTabId = 'setup';
    (useCurrentSettingsTab as jest.Mock).mockReturnValue({
      tabToDisplay: setupTab,
      setTabToDisplay,
    });
    renderTabsContent();
    expect(getHeading(setupTab)).toBeInTheDocument();
  });

  it('should render Policy tab content when tabToDisplay is "policy"', () => {
    const setTabToDisplay = jest.fn();
    const policyTab: SettingsPageTabId = 'policy';
    (useCurrentSettingsTab as jest.Mock).mockReturnValue({
      tabToDisplay: policyTab,
      setTabToDisplay,
    });
    renderTabsContent();
    expect(getHeading(policyTab)).toBeInTheDocument();
  });

  it('should render Access Control tab content when tabToDisplay is "access_control"', () => {
    const setTabToDisplay = jest.fn();
    const accessControlTab: SettingsPageTabId = 'access_control';
    (useCurrentSettingsTab as jest.Mock).mockReturnValue({
      tabToDisplay: accessControlTab,
      setTabToDisplay,
    });
    renderTabsContent();
    expect(getHeading(accessControlTab)).toBeInTheDocument();
  });

  it('should render Maskinporten tab when feature flag is enabled', () => {
    addFeatureFlagToLocalStorage(FeatureFlag.Maskinporten);

    const setTabToDisplay = jest.fn();
    const maskinPortenTab: SettingsPageTabId = 'maskinporten';
    (useCurrentSettingsTab as jest.Mock).mockReturnValue({
      tabToDisplay: maskinPortenTab,
      setTabToDisplay,
    });

    renderTabsContent();
    expect(getHeading(maskinPortenTab)).toBeInTheDocument();
  });

  it('should not render anything when feature flag is disabled for Maskinporten tab', () => {
    const setTabToDisplay = jest.fn();
    const maskinPortenTab: SettingsPageTabId = 'maskinporten';
    (useCurrentSettingsTab as jest.Mock).mockReturnValue({
      tabToDisplay: maskinPortenTab,
      setTabToDisplay,
    });
    renderTabsContent();
    expect(queryHeading(maskinPortenTab)).not.toBeInTheDocument();
  });
});

const renderTabsContent = () => {
  const queryClient = createQueryClientMock();
  return renderWithProviders(queriesMock, queryClient)(<TabsContent />);
};

const getHeading = (tabId: SettingsTabId): HTMLHeadingElement =>
  screen.getByRole('heading', {
    name: textMock(`app_settings.${tabId}_tab_heading`),
    level: 3,
  });

const queryHeading = (tabId: SettingsTabId): HTMLHeadingElement =>
  screen.queryByRole('heading', {
    name: textMock(`app_settings.${tabId}_tab_heading`),
    level: 3,
  });
