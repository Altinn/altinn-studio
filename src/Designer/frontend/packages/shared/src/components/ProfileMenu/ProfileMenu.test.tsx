import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProfileMenu, type ProfileMenuProps } from './ProfileMenu';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { FeatureFlagsProvider } from '@studio/feature-flags';
import type { Organization } from 'app-shared/types/Organization';
import type { User } from 'app-shared/types/Repository';
import { StudioPageHeader } from '@studio/components';

const mockLogout = jest.fn();
const mockEnvironment: { environment: object | null } = { environment: null };

const mockUseUserQuery = jest.fn();
const mockUseOrganizationsQuery = jest.fn();

jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: () => mockEnvironment,
}));

jest.mock('app-shared/hooks/mutations/useLogoutMutation', () => ({
  useLogoutMutation: () => ({ mutate: mockLogout }),
}));

jest.mock('app-shared/hooks/queries', () => ({
  useUserQuery: (...args: unknown[]) => mockUseUserQuery(...args),
  useOrganizationsQuery: (...args: unknown[]) => mockUseOrganizationsQuery(...args),
}));

const userMock: User = {
  avatar_url: '',
  email: '',
  full_name: 'Test User',
  id: 1,
  login: 'testuser',
  userType: 0,
};

const orgMock: Organization = { username: 'ttd', full_name: 'Test org', avatar_url: '', id: 1 };
const org2Mock: Organization = {
  username: 'skd',
  full_name: 'Skatteetaten',
  avatar_url: '',
  id: 2,
};

const defaultProps: ProfileMenuProps = {
  currentUserOrg: undefined,
  onOrgSelect: jest.fn(),
  onUserSelect: jest.fn(),
};

type RenderOptions = {
  props?: Partial<ProfileMenuProps>;
  user?: User | null; // pass null to simulate "user not loaded yet"
  organizations?: Organization[]; // omit entirely to use default; pass undefined explicitly via the helper
};

const renderProfileMenu = (options: RenderOptions = {}) => {
  const { props = {}, user = userMock } = options;
  const organizations = 'organizations' in options ? options.organizations : [orgMock, org2Mock];
  mockUseUserQuery.mockReturnValue({ data: user ?? undefined });
  mockUseOrganizationsQuery.mockReturnValue({ data: organizations });
  return render(
    <MemoryRouter>
      <FeatureFlagsProvider>
        <ServicesContextProvider {...queriesMock} client={createQueryClientMock()}>
          <StudioPageHeader>
            <ProfileMenu {...defaultProps} {...props} />
          </StudioPageHeader>
        </ServicesContextProvider>
      </FeatureFlagsProvider>
    </MemoryRouter>,
  );
};

describe('ProfileMenu', () => {
  beforeEach(() => {
    mockEnvironment.environment = null;
    jest.clearAllMocks();
  });

  it('renders nothing when user data is not loaded', () => {
    renderProfileMenu({ user: null });
    expect(screen.queryByRole('button', { name: 'Test User' })).not.toBeInTheDocument();
  });

  it('shows the user name as trigger button text when no org is active', () => {
    renderProfileMenu();
    expect(screen.getByRole('button', { name: 'Test User' })).toBeInTheDocument();
  });

  it('falls back to login when full_name is empty', () => {
    renderProfileMenu({ user: { ...userMock, full_name: '' } });
    expect(screen.getByRole('button', { name: 'testuser' })).toBeInTheDocument();
  });

  it('shows org context text when an org is active', () => {
    renderProfileMenu({ props: { currentUserOrg: 'ttd' } });
    expect(
      screen.getByRole('button', {
        name: textMock('shared.header_user_for_org', { user: 'Test User', org: 'Test org' }),
      }),
    ).toBeInTheDocument();
  });

  it('does not treat currentUserOrg as org context when it matches the user login', () => {
    renderProfileMenu({ props: { currentUserOrg: 'testuser' } });
    expect(screen.getByRole('button', { name: 'Test User' })).toBeInTheDocument();
  });

  it('renders org menu items after opening the menu', async () => {
    const user = userEvent.setup();
    renderProfileMenu();
    await user.click(screen.getByRole('button', { name: 'Test User' }));
    expect(screen.getByRole('menuitemradio', { name: 'Test org' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: 'Skatteetaten' })).toBeInTheDocument();
  });

  it('falls back to org username when org full_name is empty', async () => {
    const user = userEvent.setup();
    renderProfileMenu({ organizations: [{ ...orgMock, full_name: '' }, org2Mock] });
    await user.click(screen.getByRole('button', { name: 'Test User' }));
    expect(screen.getByRole('menuitemradio', { name: 'ttd' })).toBeInTheDocument();
  });

  it('calls onOrgSelect when clicking an org menu item', async () => {
    const onOrgSelect = jest.fn();
    const user = userEvent.setup();
    renderProfileMenu({ props: { onOrgSelect } });
    await user.click(screen.getByRole('button', { name: 'Test User' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Test org' }));
    expect(onOrgSelect).toHaveBeenCalledWith(orgMock);
  });

  it('calls onUserSelect when clicking the user menu item', async () => {
    const onUserSelect = jest.fn();
    const user = userEvent.setup();
    renderProfileMenu({ props: { onUserSelect } });
    await user.click(screen.getByRole('button', { name: 'Test User' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Test User' }));
    expect(onUserSelect).toHaveBeenCalledWith(userMock);
  });

  it('does not show the settings link when studioOidc is disabled', async () => {
    const user = userEvent.setup();
    mockEnvironment.environment = { featureFlags: { studioOidc: false } };
    renderProfileMenu();
    await user.click(screen.getByRole('button', { name: 'Test User' }));
    expect(screen.queryByRole('menuitem', { name: textMock('settings') })).not.toBeInTheDocument();
  });

  it('shows the settings link pointing to user path when studioOidc is enabled and no org is active', async () => {
    const user = userEvent.setup();
    mockEnvironment.environment = { featureFlags: { studioOidc: true } };
    renderProfileMenu();
    await user.click(screen.getByRole('button', { name: 'Test User' }));
    const settingsLink = screen.getByRole('menuitem', { name: textMock('settings') });
    expect(settingsLink).toHaveAttribute('href', '/settings/testuser');
  });

  it('shows the settings link pointing to org path when studioOidc is enabled and org is active', async () => {
    const user = userEvent.setup();
    mockEnvironment.environment = { featureFlags: { studioOidc: true } };
    renderProfileMenu({ props: { currentUserOrg: 'ttd' } });
    await user.click(
      screen.getByRole('button', {
        name: textMock('shared.header_user_for_org', { user: 'Test User', org: 'Test org' }),
      }),
    );
    const settingsLink = screen.getByRole('menuitem', { name: textMock('settings') });
    expect(settingsLink).toHaveAttribute('href', '/settings/ttd');
  });

  it('shows the gitea link pointing to user path when no org is active', async () => {
    const user = userEvent.setup();
    renderProfileMenu();
    await user.click(screen.getByRole('button', { name: 'Test User' }));
    const giteaLink = screen.getByRole('menuitem', { name: textMock('shared.header_go_to_gitea') });
    expect(giteaLink).toHaveAttribute('href', '/repos/testuser');
  });

  it('shows the gitea link pointing to org path when an org is active', async () => {
    const user = userEvent.setup();
    renderProfileMenu({ props: { currentUserOrg: 'ttd' } });
    await user.click(
      screen.getByRole('button', {
        name: textMock('shared.header_user_for_org', { user: 'Test User', org: 'Test org' }),
      }),
    );
    const giteaLink = screen.getByRole('menuitem', { name: textMock('shared.header_go_to_gitea') });
    expect(giteaLink).toHaveAttribute('href', '/repos/ttd');
  });

  it('renders the logout button', async () => {
    const user = userEvent.setup();
    renderProfileMenu();
    await user.click(screen.getByRole('button', { name: 'Test User' }));
    expect(
      screen.getByRole('menuitemradio', { name: textMock('shared.header_logout') }),
    ).toBeInTheDocument();
  });

  it('calls logout when clicking the logout button', async () => {
    const user = userEvent.setup();
    renderProfileMenu();
    await user.click(screen.getByRole('button', { name: 'Test User' }));
    await user.click(screen.getByRole('menuitemradio', { name: textMock('shared.header_logout') }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('renders no org menu items when organizations data is undefined', async () => {
    const user = userEvent.setup();
    renderProfileMenu({ organizations: undefined });
    await user.click(screen.getByRole('button', { name: 'Test User' }));
    expect(screen.queryByRole('menuitemradio', { name: 'Test org' })).not.toBeInTheDocument();
  });

  it('omits the gitea and settings links when both user login and org are empty', async () => {
    const user = userEvent.setup();
    mockEnvironment.environment = { featureFlags: { studioOidc: true } };
    renderProfileMenu({ user: { ...userMock, login: '' } });
    await user.click(screen.getByRole('button', { name: 'Test User' }));
    expect(
      screen.queryByRole('menuitem', { name: textMock('shared.header_go_to_gitea') }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: textMock('settings') })).not.toBeInTheDocument();
  });
});
