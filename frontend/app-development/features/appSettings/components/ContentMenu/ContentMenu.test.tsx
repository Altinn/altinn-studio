import React from 'react';
import { screen } from '@testing-library/react';
import { ContentMenu } from './ContentMenu';
import type { ContentMenuProps } from './ContentMenu';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderWithProviders } from 'app-development/test/mocks';
import { typedLocalStorage } from '@studio/pure-functions';
import { addFeatureFlagToLocalStorage, FeatureFlag } from 'app-shared/utils/featureToggleUtils';
import { useAppSettingsMenuTabConfigs } from '../../hooks/useAppSettingsMenuTabConfigs';
import type { StudioContentMenuButtonTabProps } from '@studio/components';
import type { SettingsPageTabId } from 'app-development/types/SettingsPageTabId';

describe('ContentMenu', () => {
  afterEach(() => {
    jest.clearAllMocks();
    typedLocalStorage.removeItem('featureFlags');
  });

  it('should render all menu tabs when Maskinporten feature flag is enabled', () => {
    const menuTabConfigs = useAppSettingsMenuTabConfigs();
    addFeatureFlagToLocalStorage(FeatureFlag.Maskinporten);

    const onChangeTabMock = jest.fn();
    renderContentMenu({ currentTab: 'about', onChangeTab: onChangeTabMock });

    menuTabConfigs.forEach((tab: StudioContentMenuButtonTabProps<SettingsPageTabId>) => {
      expect(screen.getByRole('tab', { name: tab.tabName })).toBeInTheDocument();
    });
  });

  it('should render only non-Maskinporten tabs when feature flag is disabled', () => {
    const menuTabConfigs = useAppSettingsMenuTabConfigs();
    const onChangeTabMock = jest.fn();
    renderContentMenu({ currentTab: 'about', onChangeTab: onChangeTabMock });

    menuTabConfigs.forEach((tab: StudioContentMenuButtonTabProps<SettingsPageTabId>) => {
      if (tab.tabId === 'maskinporten') {
        expect(screen.queryByRole('tab', { name: tab.tabName })).not.toBeInTheDocument();
      } else {
        expect(screen.getByRole('tab', { name: tab.tabName })).toBeInTheDocument();
      }
    });
  });
});

const defaultProps: ContentMenuProps = {
  currentTab: 'about',
  onChangeTab: () => {},
};

const renderContentMenu = (props: ContentMenuProps) => {
  const queryClient = createQueryClientMock();
  return renderWithProviders(
    queriesMock,
    queryClient,
  )(<ContentMenu {...defaultProps} {...props} />);
};
