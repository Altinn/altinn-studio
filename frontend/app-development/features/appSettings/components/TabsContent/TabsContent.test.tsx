import React from 'react';
import { screen } from '@testing-library/react';
import { TabsContent } from './TabsContent';
import type { TabsContentProps } from './TabsContent';
import { renderWithProviders } from 'app-development/test/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { typedLocalStorage } from '@studio/pure-functions';
import { addFeatureFlagToLocalStorage, FeatureFlag } from 'app-shared/utils/featureToggleUtils';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { SettingsTabId } from '../../types/SettingsTabId';

describe('TabsContent', () => {
  afterEach(() => {
    jest.clearAllMocks();
    typedLocalStorage.removeItem('featureFlags');
  });

  it('should render About tab content when currentTab is "about"', () => {
    renderTabsContent({ currentTab: 'about' });
    expect(getHeading('about')).toBeInTheDocument();
  });

  it('should render Setup tab content when currentTab is "setup"', () => {
    renderTabsContent({ currentTab: 'setup' });
    expect(screen.getByText('Setup tab')).toBeInTheDocument();
  });

  it('should render Policy tab content when currentTab is "policy"', () => {
    renderTabsContent({ currentTab: 'policy' });
    expect(screen.getByText('Policy tab')).toBeInTheDocument();
  });

  it('should render Access Control tab content when currentTab is "access_control"', () => {
    renderTabsContent({ currentTab: 'access_control' });
    expect(screen.getByText('Access Control tab')).toBeInTheDocument();
  });

  it('should render Maskinporten tab when feature flag is enabled', () => {
    addFeatureFlagToLocalStorage(FeatureFlag.Maskinporten);

    renderTabsContent({ currentTab: 'maskinporten' });
    expect(screen.getByText('Maskinporten tab')).toBeInTheDocument();
  });

  it('should not render anything when feature flag is disabled for Maskinporten tab', () => {
    renderTabsContent({ currentTab: 'maskinporten' });
    expect(screen.queryByText('Maskinporten tab')).not.toBeInTheDocument();
  });
});

const defaultProps: TabsContentProps = {
  currentTab: 'about',
};

const renderTabsContent = (props: Partial<TabsContentProps> = {}) => {
  const queryClient = createQueryClientMock();
  return renderWithProviders(
    queriesMock,
    queryClient,
  )(<TabsContent {...defaultProps} {...props} />);
};

const getHeading = (tabId: SettingsTabId): HTMLHeadingElement =>
  screen.getByRole('heading', {
    name: textMock(`app_settings.${tabId}_tab_heading`),
    level: 2,
  });
