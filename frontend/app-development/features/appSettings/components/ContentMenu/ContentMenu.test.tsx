import React from 'react';
import { screen } from '@testing-library/react';
import { ContentMenu } from './ContentMenu';
import type { ContentMenuProps } from './ContentMenu';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { SettingsModalTabId } from 'app-development/types/SettingsModalTabId';
import type { StudioContentMenuButtonTabProps } from '@studio/components';
import { renderWithProviders } from 'app-development/test/mocks';
import { typedLocalStorage } from '@studio/pure-functions';
import { addFeatureFlagToLocalStorage, FeatureFlag } from 'app-shared/utils/featureToggleUtils';
import { useAppSettingsMenuTabConfigs } from '../../hooks/useAppSettingsMenuTabConfigs';

jest.mock('../../hooks/useAppSettingsMenuTabConfigs');

const maskinportenTab: StudioContentMenuButtonTabProps<SettingsModalTabId> = {
  tabId: 'maskinporten',
  tabName: 'Maskinporten',
  icon: <svg />,
};

const aboutTab: StudioContentMenuButtonTabProps<SettingsModalTabId> = {
  tabId: 'about',
  tabName: 'About',
  icon: <svg />,
};

describe('ContentMenu', () => {
  afterEach(() => {
    jest.clearAllMocks();
    typedLocalStorage.removeItem('featureFlags');
  });

  it('should render all menu tabs when Maskinporten feature flag is enabled', () => {
    (useAppSettingsMenuTabConfigs as jest.Mock).mockReturnValue([maskinportenTab, aboutTab]);

    addFeatureFlagToLocalStorage(FeatureFlag.Maskinporten);

    const onChangeTabMock = jest.fn();
    renderContentMenu({ currentTab: 'about', onChangeTab: onChangeTabMock });

    expect(screen.getByRole('tab', { name: aboutTab.tabName })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: maskinportenTab.tabName })).toBeInTheDocument();
  });

  it('should render only non-Maskinporten tabs when feature flag is disabled', () => {
    (useAppSettingsMenuTabConfigs as jest.Mock).mockReturnValue([maskinportenTab, aboutTab]);
    const onChangeTabMock = jest.fn();
    renderContentMenu({ currentTab: 'about', onChangeTab: onChangeTabMock });

    expect(screen.getByRole('tab', { name: aboutTab.tabName })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: maskinportenTab.tabName })).not.toBeInTheDocument();
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
