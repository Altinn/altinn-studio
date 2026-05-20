import { render, screen } from '@testing-library/react';
import { TabsContent } from './TabsContent';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { SettingsTabId } from '../../types/SettingsTabId';
import type { SettingsPageTabId } from 'app-development/types/SettingsPageTabId';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { TestAppRouter } from '@studio/testing/testRoutingUtils';
import type { OrgList } from 'app-shared/types/OrgList';

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

  it.each(tabs)('should render %s tab content when tabToDisplay is "%s"', async (tab) => {
    renderTabsContent(tab);
    expect(await findHeading(tab)).toBeInTheDocument();
  });

  it('should render the about tab when Maskinporten is requested for a personal app', async () => {
    renderTabsContent('maskinporten', { orgs: {} });

    expect(await findHeading('about')).toBeInTheDocument();
    expect(queryHeading('maskinporten')).not.toBeInTheDocument();
  });
});

const orgListWithTestOrg: OrgList = {
  orgs: {
    testOrg: {
      name: { nb: 'Testdepartementet' },
      logo: '',
      orgnr: '123456789',
      homepage: '',
      environments: [],
    },
  },
};

const renderTabsContent = (initialEntries: string = '', orgList: OrgList = orgListWithTestOrg) => {
  const queryClient = createQueryClientMock();
  return render(
    <TestAppRouter initialPath={`/testOrg/testApp?currentTab=${initialEntries}`}>
      <ServicesContextProvider
        {...queriesMock}
        client={queryClient}
        getOrgList={jest.fn().mockImplementation(() => Promise.resolve(orgList))}
      >
        <TabsContent />
      </ServicesContextProvider>
    </TestAppRouter>,
  );
};

const findHeading = (tabId: SettingsTabId): Promise<HTMLHeadingElement> =>
  screen.findByRole('heading', {
    name: textMock(`app_settings.${tabId}_tab_heading`),
    level: 3,
  });

const queryHeading = (tabId: SettingsTabId): HTMLHeadingElement | null =>
  screen.queryByRole('heading', {
    name: textMock(`app_settings.${tabId}_tab_heading`),
    level: 3,
  });
