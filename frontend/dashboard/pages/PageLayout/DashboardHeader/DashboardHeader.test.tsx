import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardHeader } from './DashboardHeader';
import { HeaderContext, SelectedContextType } from '../../../context/HeaderContext';
import { Subroute } from '../../../enums/Subroute';
import { useParams } from 'react-router-dom';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { type User } from 'app-shared/types/Repository';
import { type Organization } from 'app-shared/types/Organization';
import { type HeaderContextType } from 'dashboard/context/HeaderContext';
import { MockServicesContextWrapper } from 'dashboard/dashboardTestUtils';
import { typedLocalStorage } from '@studio/pure-functions';
import { FeatureFlag } from 'app-shared/utils/featureToggleUtils';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: jest.fn().mockReturnValue({ subroute: 'app-dashboard', selectedContext: 'self' }),
}));

const userMock: User = {
  id: 1,
  avatar_url: '',
  email: 'tester@tester.test',
  full_name: 'Tester Testersen',
  login: 'tester',
  userType: 0,
};

const mockOrg1: Organization = {
  avatar_url: '',
  id: 12,
  username: 'ttd',
  full_name: 'Test',
};
const mockOrg2: Organization = {
  avatar_url: '',
  id: 23,
  username: 'unit-test-2',
  full_name: 'unit-test-2',
};
const mockOrganizations: Organization[] = [mockOrg1, mockOrg2];

describe('DashboardHeader', () => {
  afterEach(jest.clearAllMocks);

  it('should render the user name as the profile button when in self context', () => {
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: SelectedContextType.Self,
    });

    renderDashboardHeader();

    expect(screen.getByRole('button', { name: userMock.full_name })).toBeInTheDocument();
  });

  it('should render the organization name when selected context is an organization', () => {
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: 'ttd',
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
    typedLocalStorage.removeItem('featureFlags');
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
    typedLocalStorage.removeItem('featureFlags');
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
    typedLocalStorage.removeItem('featureFlags');
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
});

const headerContextValue: HeaderContextType = {
  user: userMock,
  selectableOrgs: mockOrganizations,
};

const renderDashboardHeader = () => {
  return render(
    <MockServicesContextWrapper>
      <HeaderContext.Provider value={headerContextValue}>
        <DashboardHeader />
      </HeaderContext.Provider>
    </MockServicesContextWrapper>,
  );
};
