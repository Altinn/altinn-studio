import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardHeader, type DashboardHeaderProps } from './DashboardHeader';
import { SelectedContextType } from '../../../enums/SelectedContextType';
import { useLocation, useParams } from 'react-router-dom';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { StringUtils, typedLocalStorage } from '@studio/pure-functions';
import { FeatureFlag } from 'app-shared/utils/featureToggleUtils';
import { Subroute } from '../../../enums/Subroute';
import { HeaderContextProvider } from '../../../context/HeaderContext';
import { mockOrg1, mockOrg2 } from '../../../testing/organizationMock';
import { userMock } from '../../../testing/userMock';
import { renderWithProviders } from '../../../testing/mocks';
import { headerContextValueMock } from '../../../testing/headerContextMock';
import { useMediaQuery } from '@studio/components-legacy/src/hooks/useMediaQuery';

const mockOrgTtd: string = 'ttd';
const mockPathnameOrgLibraryTtd: string = `${StringUtils.removeLeadingSlash(Subroute.OrgLibrary)}/${mockOrgTtd}`;

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: jest.fn().mockReturnValue({
    subroute: 'app-dashboard',
    selectedContext: 'self',
  }),
  useLocation: jest.fn().mockReturnValue({ pathname: 'app-dashboard/self' }),
}));

jest.mock('@studio/components-legacy/src/hooks/useMediaQuery');

describe('DashboardHeader', () => {
  afterEach(() => {
    jest.clearAllMocks();
    typedLocalStorage.removeItem('featureFlags');
  });

  it('should render the user name as the profile button when in self context', () => {
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: SelectedContextType.Self,
    });

    renderDashboardHeader();

    expect(screen.getByRole('button', { name: userMock.full_name })).toBeInTheDocument();
  });

  it('should render the organization name when selected context is an organization', () => {
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: mockOrgTtd,
    });

    renderDashboardHeader();

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
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: SelectedContextType.Self,
    });

    renderDashboardHeader();

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
    typedLocalStorage.setItem('featureFlags', [FeatureFlag.OrgLibrary]);
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
    typedLocalStorage.setItem('featureFlags', FeatureFlag.OrgLibrary);
    renderDashboardHeader();
    const libraryMenuItem = screen.getByRole('link', {
      name: textMock('dashboard.header_item_library'),
    });
    expect(libraryMenuItem).toHaveAttribute(
      'href',
      `${Subroute.OrgLibrary}/${SelectedContextType.Self}`,
    );
  });

  it('should not render library menu element when featureFlag is not turned on', () => {
    renderDashboardHeader();
    const libraryMenuItem = screen.queryByRole('link', {
      name: textMock('dashboard.header_item_library'),
    });
    expect(libraryMenuItem).not.toBeInTheDocument();
  });

  it('should not render dashboard menu element when featureFlag is not turned on', () => {
    renderDashboardHeader();
    const dashboardMenuItem = screen.queryByRole('link', {
      name: textMock('dashboard.header_item_dashboard'),
    });
    expect(dashboardMenuItem).not.toBeInTheDocument();
  });

  it('should render apps menu element with correct link', () => {
    typedLocalStorage.setItem('featureFlags', FeatureFlag.OrgLibrary);
    renderDashboardHeader();
    const appsMenuItem = screen.getByRole('link', {
      name: textMock('dashboard.header_item_dashboard'),
    });
    expect(appsMenuItem).toHaveAttribute(
      'href',
      `${Subroute.AppDashboard}/${SelectedContextType.Self}`,
    );
  });

  it('should navigate to the correct organization context when an org is selected', async () => {
    const user = userEvent.setup();
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: SelectedContextType.Self,
      subroute: Subroute.AppDashboard,
    });

    renderDashboardHeader();

    const avatarButton = screen.getByRole('button', { name: userMock.full_name });
    await user.click(avatarButton);

    const org1Item = screen.getByRole('menuitemradio', { name: mockOrg1.full_name });
    await user.click(org1Item);

    expect(mockNavigate).toHaveBeenCalledWith(`${Subroute.AppDashboard}/${mockOrg1.username}`);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('should navigate to the "All" context when the "All" menu item is clicked', async () => {
    const user = userEvent.setup();
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: SelectedContextType.Self,
      subroute: Subroute.AppDashboard,
    });

    renderDashboardHeader();

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
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: SelectedContextType.All,
      subroute: Subroute.AppDashboard,
    });

    renderDashboardHeader();

    const avatarButton = screen.getByRole('button', { name: userMock.full_name });
    await user.click(avatarButton);

    const selfItem = screen.getByRole('menuitemradio', { name: userMock.full_name });
    await user.click(selfItem);

    expect(mockNavigate).toHaveBeenCalledWith(
      `${Subroute.AppDashboard}/${SelectedContextType.Self}`,
    );
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('should not render the submenu when showSubMenu is false', () => {
    typedLocalStorage.setItem('featureFlags', [FeatureFlag.OrgLibrary]);

    (useParams as jest.Mock).mockReturnValue({
      selectedContext: mockOrgTtd,
      subroute: Subroute.OrgLibrary,
    });
    (useLocation as jest.Mock).mockReturnValue({ pathname: mockPathnameOrgLibraryTtd });

    renderDashboardHeader({ showSubMenu: false, isRepoError: false });

    expect(getFetchChangesButton()).not.toBeInTheDocument();
  });

  it('should not render the submenu when isRepoError is true', () => {
    typedLocalStorage.setItem('featureFlags', [FeatureFlag.OrgLibrary]);

    (useParams as jest.Mock).mockReturnValue({
      selectedContext: mockOrgTtd,
      subroute: Subroute.OrgLibrary,
    });
    (useLocation as jest.Mock).mockReturnValue({ pathname: mockPathnameOrgLibraryTtd });

    renderDashboardHeader({ showSubMenu: true, isRepoError: true });

    expect(getFetchChangesButton()).not.toBeInTheDocument();
  });

  it('should not render the submenu when the page is not orgLibrary', () => {
    typedLocalStorage.setItem('featureFlags', [FeatureFlag.OrgLibrary]);

    (useParams as jest.Mock).mockReturnValue({
      selectedContext: mockOrgTtd,
      subroute: Subroute.AppDashboard,
    });
    (useLocation as jest.Mock).mockReturnValue({ pathname: 'notOrgLibraryPath' });

    renderDashboardHeader({ showSubMenu: true, isRepoError: false });

    expect(getFetchChangesButton()).not.toBeInTheDocument();
  });

  it('should not render the submenu when page is orgLibrary and feature flag is not on', () => {
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: mockOrgTtd,
      subroute: Subroute.OrgLibrary,
    });
    (useLocation as jest.Mock).mockReturnValue({ pathname: mockPathnameOrgLibraryTtd });
    renderDashboardHeader({ showSubMenu: true, isRepoError: false });

    expect(getFetchChangesButton()).not.toBeInTheDocument();
  });

  it('should not render the submenu when the selected context is not org', () => {
    typedLocalStorage.setItem('featureFlags', [FeatureFlag.OrgLibrary]);

    (useParams as jest.Mock).mockReturnValue({
      selectedContext: SelectedContextType.Self,
      subroute: Subroute.OrgLibrary,
    });
    (useLocation as jest.Mock).mockReturnValue({ pathname: mockPathnameOrgLibraryTtd });

    renderDashboardHeader({ showSubMenu: true, isRepoError: false });

    expect(getFetchChangesButton()).not.toBeInTheDocument();
  });

  it('should render the submenu when showSubMenu is true, there is no repo error, page is orgLibrary and feature flag is on', () => {
    typedLocalStorage.setItem('featureFlags', [FeatureFlag.OrgLibrary]);

    (useParams as jest.Mock).mockReturnValue({
      selectedContext: mockOrgTtd,
      subroute: Subroute.OrgLibrary,
    });
    (useLocation as jest.Mock).mockReturnValue({ pathname: mockPathnameOrgLibraryTtd });

    renderDashboardHeader({ showSubMenu: true, isRepoError: false });

    expect(getFetchChangesButton()).toBeInTheDocument();
  });

  it('should render small navigation menu when the screen is small', () => {
    typedLocalStorage.setItem('featureFlags', FeatureFlag.OrgLibrary);
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
    typedLocalStorage.setItem('featureFlags', FeatureFlag.OrgLibrary);

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

const renderDashboardHeader = (props: Partial<DashboardHeaderProps> = {}) => {
  return renderWithProviders(
    <HeaderContextProvider {...headerContextValueMock}>
      <DashboardHeader {...defaultProps} {...props} />
    </HeaderContextProvider>,
  );
};

const defaultProps: DashboardHeaderProps = {
  showSubMenu: false,
};

function getFetchChangesButton(): HTMLElement | null {
  return screen.queryByRole('button', { name: textMock('sync_header.fetch_changes') });
}
