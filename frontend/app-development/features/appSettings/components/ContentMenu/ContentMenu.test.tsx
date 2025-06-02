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

    const setTabToDisplay = jest.fn();
    (useCurrentSettingsTab as jest.Mock).mockReturnValue({
      tabToDisplay: 'about',
      setTabToDisplay,
    });
    renderContentMenu();

    menuTabConfigs.forEach((tab: StudioContentMenuButtonTabProps<SettingsPageTabId>) => {
      expect(screen.getByRole('tab', { name: tab.tabName })).toBeInTheDocument();
    });
  });

  it('should render only non-Maskinporten tabs when feature flag is disabled', () => {
    const menuTabConfigs = useAppSettingsMenuTabConfigs();
    const setTabToDisplay = jest.fn();
    (useCurrentSettingsTab as jest.Mock).mockReturnValue({
      tabToDisplay: 'about',
      setTabToDisplay,
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

  it('should call setTabToDisplay when a tab is clicked', () => {
    const setTabToDisplay = jest.fn();
    const tabToDisplay: SettingsPageTabId = 'about';
    (useCurrentSettingsTab as jest.Mock).mockReturnValue({
      tabToDisplay,
      setTabToDisplay,
    });
    renderContentMenu();

    const aboutTab = screen.getByRole('tab', {
      name: textMock(`app_settings.left_nav_tab_${tabToDisplay}`),
    });
    aboutTab.click();

    expect(setTabToDisplay).toHaveBeenCalledWith(tabToDisplay);
    expect(setTabToDisplay).toHaveBeenCalledTimes(1);
  });
});

const renderContentMenu = () => {
  const queryClient = createQueryClientMock();
  return renderWithProviders(queriesMock, queryClient)(<ContentMenu />);
};
