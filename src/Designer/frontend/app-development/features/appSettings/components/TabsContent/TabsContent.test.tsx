import { render, screen } from '@testing-library/react';
import { TabsContent } from './TabsContent';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { SettingsTabId } from '../../types/SettingsTabId';
import type { SettingsPageTabId } from 'app-development/types/SettingsPageTabId';
import { MemoryRouter } from 'react-router-dom';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';

const tabs: SettingsPageTabId[] = [
  'about',
  'setup',
  'policy',
  'access_control',
  'run',
  'maskinporten',
];

describe('TabsContent', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each(tabs)('should render %s tab content when tabToDisplay is "%s"', (tab) => {
    renderTabsContent(tab);
    expect(getHeading(tab)).toBeInTheDocument();
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
