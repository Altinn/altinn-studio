import { render, screen } from '@testing-library/react';
import { ContentMenu } from './ContentMenu';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { TestAppRouter } from '@studio/testing/testRoutingUtils';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { OrgList } from 'app-shared/types/OrgList';

const allTabNames = ['about', 'setup', 'policy', 'access_control', 'run', 'maskinporten'].map(
  (tabId) => textMock(`app_settings.left_nav_tab_${tabId}`),
);

describe('ContentMenu', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render all menu tabs for service owner apps', async () => {
    renderContentMenu();

    for (const tabName of allTabNames) {
      expect(await screen.findByRole('tab', { name: tabName })).toBeInTheDocument();
    }
  });

  it('should hide Maskinporten for personal apps', async () => {
    renderContentMenu({ orgs: {} });

    expect(
      await screen.findByRole('tab', { name: textMock('app_settings.left_nav_tab_about') }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('tab', { name: textMock('app_settings.left_nav_tab_maskinporten') }),
    ).not.toBeInTheDocument();
  });

  it('should call setTabToDisplay when a tab is clicked', async () => {
    const user = userEvent.setup();
    renderContentMenu();

    const aboutTab = screen.getByRole('tab', {
      name: textMock('app_settings.left_nav_tab_about'),
    });
    const setupTab = screen.getByRole('tab', {
      name: textMock('app_settings.left_nav_tab_setup'),
    });
    expect(aboutTab).toHaveAttribute('tabindex', '0');
    expect(setupTab).toHaveAttribute('tabindex', '-1');

    await user.click(setupTab);

    expect(aboutTab).toHaveAttribute('tabindex', '-1');
    expect(setupTab).toHaveAttribute('tabindex', '0');
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

const renderContentMenu = (orgList: OrgList = orgListWithTestOrg) => {
  const queryClient = createQueryClientMock();
  return render(
    <TestAppRouter initialPath='/testOrg/testApp?currentTab=about'>
      <ServicesContextProvider
        {...queriesMock}
        client={queryClient}
        getOrgList={jest.fn().mockImplementation(() => Promise.resolve(orgList))}
      >
        <ContentMenu />
      </ServicesContextProvider>
    </TestAppRouter>,
  );
};
