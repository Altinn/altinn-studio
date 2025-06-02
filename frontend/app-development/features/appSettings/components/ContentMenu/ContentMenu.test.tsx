import React from 'react';
import { screen } from '@testing-library/react';
import { ContentMenu } from './ContentMenu';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderWithProviders } from 'app-development/test/mocks';
import { typedLocalStorage } from '@studio/pure-functions';
import { addFeatureFlagToLocalStorage, FeatureFlag } from 'app-shared/utils/featureToggleUtils';
import { useAppSettingsMenuTabConfigs } from '../../hooks/useAppSettingsMenuTabConfigs';
import type { StudioContentMenuButtonTabProps } from '@studio/components';
import type { SettingsPageTabId } from 'app-development/types/SettingsPageTabId';
import { useCurrentSettingsTab } from '../../hooks/useCurrentSettingsTab';
import { textMock } from '@studio/testing/mocks/i18nMock';

jest.mock('../../hooks/useCurrentSettingsTab');

describe('ContentMenu', () => {
  afterEach(() => {
    jest.clearAllMocks();
    typedLocalStorage.removeItem('featureFlags');
  });

  it('should render all menu tabs when Maskinporten feature flag is enabled', () => {
    const menuTabConfigs = useAppSettingsMenuTabConfigs();
    addFeatureFlagToLocalStorage(FeatureFlag.Maskinporten);

    const setCurrentTab = jest.fn();
    (useCurrentSettingsTab as jest.Mock).mockReturnValue({
      currentTab: 'about',
      setCurrentTab,
    });
    renderContentMenu();

    menuTabConfigs.forEach((tab: StudioContentMenuButtonTabProps<SettingsPageTabId>) => {
      expect(screen.getByRole('tab', { name: tab.tabName })).toBeInTheDocument();
    });
  });

  it('should render only non-Maskinporten tabs when feature flag is disabled', () => {
    const menuTabConfigs = useAppSettingsMenuTabConfigs();
    const setCurrentTab = jest.fn();
    (useCurrentSettingsTab as jest.Mock).mockReturnValue({
      currentTab: 'about',
      setCurrentTab,
    });
    renderContentMenu();

    menuTabConfigs.forEach((tab: StudioContentMenuButtonTabProps<SettingsPageTabId>) => {
      if (tab.tabId === 'maskinporten') {
        expect(screen.queryByRole('tab', { name: tab.tabName })).not.toBeInTheDocument();
      } else {
        expect(screen.getByRole('tab', { name: tab.tabName })).toBeInTheDocument();
      }
    });
  });

  it('should call setCurrentTab when a tab is clicked', () => {
    const setCurrentTab = jest.fn();
    const currentTab: SettingsPageTabId = 'about';
    (useCurrentSettingsTab as jest.Mock).mockReturnValue({
      currentTab,
      setCurrentTab,
    });
    renderContentMenu();

    const aboutTab = screen.getByRole('tab', {
      name: textMock(`app_settings.left_nav_tab_${currentTab}`),
    });
    aboutTab.click();

    expect(setCurrentTab).toHaveBeenCalledWith(currentTab);
    expect(setCurrentTab).toHaveBeenCalledTimes(1);
  });
});

const renderContentMenu = () => {
  const queryClient = createQueryClientMock();
  return renderWithProviders(queriesMock, queryClient)(<ContentMenu />);
};
