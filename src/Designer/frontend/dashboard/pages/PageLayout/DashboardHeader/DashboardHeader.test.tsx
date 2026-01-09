import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardHeader } from './DashboardHeader';
import { SelectedContextType } from '../../../enums/SelectedContextType';
import { Route, Routes, useLocation } from 'react-router-dom';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { StringUtils } from '@studio/pure-functions';
import { Subroute } from '../../../enums/Subroute';
import { HeaderContextProvider } from '../../../context/HeaderContext';
import { mockOrg1, mockOrg2 } from '../../../testing/organizationMock';
import { userMock } from '../../../testing/userMock';
import { renderWithProviders } from '../../../testing/mocks';
import { headerContextValueMock } from '../../../testing/headerContextMock';
import { useMediaQuery } from '@studio/components-legacy/src/hooks/useMediaQuery';
import { repoStatus } from 'app-shared/mocks/mocks';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';

const mockOrgTtd: string = 'ttd';
const mockPathnameOrgLibraryTtd: string = `${StringUtils.removeLeadingSlash(Subroute.OrgLibrary)}/${mockOrgTtd}`;

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: jest.fn().mockReturnValue({ pathname: 'app-dashboard/self' }),
}));

jest.mock('@studio/components-legacy/src/hooks/useMediaQuery');

describe('DashboardHeader', () => {
  afterEach(jest.clearAllMocks);

  it('should render the user name as the profile button when in self context', () => {
    renderDashboardHeader({ selectedContext: SelectedContextType.Self });
    expect(screen.getByRole('button', { name: userMock.full_name })).toBeInTheDocument();
  });

  it('should render the organization name when selected context is an organization', () => {
    renderDashboardHeader({ selectedContext: mockOrgTtd });
    expect(
      screen.getByRole('button', {
        name: textMock('shared.header_user_for_org', {
          user: userMock.full_name,
          org: mockOrg1.full_name,
        }),
      }),
    ).toBeInTheDocument();
  });

  it('should show the profile menu with all its menuitem when the avatar is clicked', async () => {
    const user = userEvent.setup();
    renderDashboardHeader({ selectedContext: SelectedContextType.Self });

    const avatarButton = screen.getByRole('button', { name: userMock.full_name });
    await user.click(avatarButton);

    const allItem = screen.getByRole('menuitemradio', { name: textMock('shared.header_all') });
    expect(allItem).toBeInTheDocument();

    const org1Item = screen.getByRole('menuitemradio', { name: mockOrg1.full_name });
    expect(org1Item).toBeInTheDocument();

    const org2Item = screen.getByRole('menuitemradio', { name: mockOrg2.full_name });
    expect(org2Item).toBeInTheDocument();

    const userItem = screen.getByRole('menuitemradio', { name: userMock.full_name });
    expect(userItem).toBeInTheDocument();

    const giteaItem = screen.getByRole('menuitem', { name: textMock('shared.header_go_to_gitea') });
    expect(giteaItem).toBeInTheDocument();

    const logoutItem = screen.getByRole('menuitemradio', {
      name: textMock('shared.header_logout'),
    });
    expect(logoutItem).toBeInTheDocument();
  });

  it('should render correct menu elements in header', () => {
    renderDashboardHeader();
    const libraryMenuItem = screen.getByRole('link', {
      name: textMock('dashboard.header_item_library'),
    });
    expect(libraryMenuItem).toBeInTheDocument();
    const appsMenuItem = screen.getByRole('link', {
      name: textMock('dashboard.header_item_dashboard'),
    });
    expect(appsMenuItem).toBeInTheDocument();
  });

  it('should render library menu element with correct link', () => {
    renderDashboardHeader();
    const libraryMenuItem = screen.getByRole('link', {
      name: textMock('dashboard.header_item_library'),
    });
    expect(libraryMenuItem).toHaveAttribute(
      'href',
      `/${Subroute.OrgLibrary}/${SelectedContextType.Self}`,
    );
  });

  it('should render apps menu element with correct link', () => {
    renderDashboardHeader();
    const appsMenuItem = screen.getByRole('link', {
      name: textMock('dashboard.header_item_dashboard'),
    });
    expect(appsMenuItem).toHaveAttribute(
      'href',
      `/${Subroute.AppDashboard}/${SelectedContextType.Self}`,
    );
  });

  it('should navigate to the correct organization context when an org is selected', async () => {
    const user = userEvent.setup();
    renderDashboardHeader({
      selectedContext: SelectedContextType.Self,
      subroute: Subroute.AppDashboard,
    });

    const avatarButton = screen.getByRole('button', { name: userMock.full_name });
    await user.click(avatarButton);

    const org1Item = screen.getByRole('menuitemradio', { name: mockOrg1.full_name });
    await user.click(org1Item);

    expect(mockNavigate).toHaveBeenCalledWith(`${Subroute.AppDashboard}/${mockOrg1.username}`);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('should navigate to the "All" context when the "All" menu item is clicked', async () => {
    const user = userEvent.setup();
    renderDashboardHeader({
      selectedContext: SelectedContextType.Self,
      subroute: Subroute.AppDashboard,
    });

    const avatarButton = screen.getByRole('button', { name: userMock.full_name });
    await user.click(avatarButton);

    const allItem = screen.getByRole('menuitemradio', { name: textMock('shared.header_all') });
    await user.click(allItem);

    expect(mockNavigate).toHaveBeenCalledWith(
      `${Subroute.AppDashboard}/${SelectedContextType.All}`,
    );
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('should navigate to the "Self" context when the "Self" menu item is clicked', async () => {
    const user = userEvent.setup();
    renderDashboardHeader({
      selectedContext: SelectedContextType.All,
      subroute: Subroute.AppDashboard,
    });

    const avatarButton = screen.getByRole('button', { name: userMock.full_name });
    await user.click(avatarButton);

    const selfItem = screen.getByRole('menuitemradio', { name: userMock.full_name });
    await user.click(selfItem);

    expect(mockNavigate).toHaveBeenCalledWith(
      `${Subroute.AppDashboard}/${SelectedContextType.Self}`,
    );
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('should not render the submenu when there is a merge conflict', () => {
    (useLocation as jest.Mock).mockReturnValue({ pathname: mockPathnameOrgLibraryTtd });

    const getRepoStatus = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ ...repoStatus, hasMergeConflict: true }));

    renderDashboardHeader(
      {
        selectedContext: mockOrgTtd,
        subroute: Subroute.OrgLibrary,
      },
      { getRepoStatus },
    );
    expect(getFetchChangesButton()).not.toBeInTheDocument();
  });

  it('should not render the submenu when there is a repo error', () => {
    (useLocation as jest.Mock).mockReturnValue({ pathname: mockPathnameOrgLibraryTtd });

    const getRepoStatus = jest.fn().mockImplementation(() => Promise.reject(new Error('error')));

    renderDashboardHeader(
      {
        selectedContext: mockOrgTtd,
        subroute: Subroute.OrgLibrary,
      },
      { getRepoStatus },
    );
    expect(getFetchChangesButton()).not.toBeInTheDocument();
  });

  it('should not render the submenu when the page is not orgLibrary', () => {
    (useLocation as jest.Mock).mockReturnValue({ pathname: 'notOrgLibraryPath' });

    const getRepoStatus = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ ...repoStatus, hasMergeConflict: false }));

    renderDashboardHeader(
      {
        selectedContext: mockOrgTtd,
        subroute: Subroute.AppDashboard,
      },
      { getRepoStatus },
    );
    expect(getFetchChangesButton()).not.toBeInTheDocument();
  });

  it('should not render the submenu when the selected context is not org', () => {
    (useLocation as jest.Mock).mockReturnValue({ pathname: mockPathnameOrgLibraryTtd });
    const getRepoStatus = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ ...repoStatus, hasMergeConflict: false }));

    renderDashboardHeader(
      {
        selectedContext: SelectedContextType.Self,
        subroute: Subroute.OrgLibrary,
      },
      { getRepoStatus },
    );
    expect(getFetchChangesButton()).not.toBeInTheDocument();
  });

  it('should render the submenu when showSubMenu is true, there is no repo error and page is orgLibrary', async () => {
    (useLocation as jest.Mock).mockReturnValue({ pathname: mockPathnameOrgLibraryTtd });
    const getRepoStatus = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ ...repoStatus, hasMergeConflict: false }));

    renderDashboardHeader(
      {
        selectedContext: mockOrgTtd,
        subroute: Subroute.OrgLibrary,
      },
      { getRepoStatus },
    );

    await waitForElementToBeRemoved(() => screen.queryByText(textMock('general.loading')));
    expect(getFetchChangesButton()).toBeInTheDocument();
  });

  it('should render small navigation menu when the screen is small', () => {
    (useMediaQuery as jest.Mock).mockReturnValue(true);
    renderDashboardHeader();

    expect(screen.getByRole('button', { name: textMock('top_menu.menu') })).toBeInTheDocument();

    expect(
      screen.queryByRole('link', {
        name: textMock('dashboard.header_item_library'),
      }),
    ).not.toBeInTheDocument();
  });

  it('should render large navigation menu when the screen is large', () => {
    (useMediaQuery as jest.Mock).mockReturnValue(false);
    renderDashboardHeader();

    expect(
      screen.queryByRole('button', { name: textMock('top_menu.menu') }),
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole('link', {
        name: textMock('dashboard.header_item_library'),
      }),
    ).toBeInTheDocument();
  });
});

type Params = {
  subroute?: string;
  selectedContext?: string;
};

const renderDashboardHeader = (
  { subroute = Subroute.AppDashboard, selectedContext = SelectedContextType.Self }: Params = {},
  queries: Partial<ServicesContextProps> = {},
) => {
  const initialEntry = `/${subroute}/${selectedContext}`;
  return renderWithProviders(
    <HeaderContextProvider {...headerContextValueMock}>
      <Routes>
        <Route path='/:subroute/:selectedContext' element={<DashboardHeader />} />
      </Routes>
    </HeaderContextProvider>,
    { queries: { ...queries, ...queriesMock }, initialEntries: [initialEntry] },
  );
};

function getFetchChangesButton(): HTMLElement | null {
  return screen.queryByRole('button', { name: textMock('sync_header.fetch_changes') });
}
