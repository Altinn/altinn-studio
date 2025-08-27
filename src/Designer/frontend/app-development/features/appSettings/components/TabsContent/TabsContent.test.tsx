import React from 'react';
import { render, screen } from '@testing-library/react';
import { TabsContent } from './TabsContent';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { typedLocalStorage } from '@studio/pure-functions';
import { addFeatureFlagToLocalStorage, FeatureFlag } from 'app-shared/utils/featureToggleUtils';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { SettingsTabId } from '../../types/SettingsTabId';
import type { SettingsPageTabId } from '../../../../types/SettingsPageTabId';
import { MemoryRouter } from 'react-router-dom';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';

const tabs: SettingsPageTabId[] = ['about', 'setup', 'policy', 'access_control', 'maskinporten'];

describe('TabsContent', () => {
  afterEach(() => {
    jest.clearAllMocks();
    typedLocalStorage.removeItem('featureFlags');
  });

  it.each(tabs)('should render %s tab content when tabToDisplay is "%s"', (tab) => {
    tab === 'maskinporten' && addFeatureFlagToLocalStorage(FeatureFlag.Maskinporten);
    renderTabsContent(tab);
    expect(getHeading(tab)).toBeInTheDocument();
  });

  it('should not render anything when feature flag is disabled for Maskinporten tab', () => {
    const maskinPortenTab: SettingsPageTabId = 'maskinporten';
    renderTabsContent(maskinPortenTab);
    expect(queryHeading(maskinPortenTab)).not.toBeInTheDocument();
  });
});

const renderTabsContent = (initialEntries: string = '') => {
  const queryClient = createQueryClientMock();
  return render(
    <MemoryRouter initialEntries={[`?currentTab=${initialEntries}`]}>
      <ServicesContextProvider {...queriesMock} client={queryClient}>
        <TabsContent />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
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
