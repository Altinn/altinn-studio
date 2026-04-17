import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProfileMenu, type ProfileMenuProps } from './ProfileMenu';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { FeatureFlagsProvider } from '@studio/feature-flags';
import type { Organization } from 'app-shared/types/Organization';
import type { User } from 'app-shared/types/Repository';
import { StudioPageHeader } from '@studio/components';

const mockLogout = jest.fn();
const mockEnvironment: { environment: object | null } = { environment: null };

jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: () => mockEnvironment,
}));

jest.mock('app-shared/hooks/mutations/useLogoutMutation', () => ({
  useLogoutMutation: () => ({ mutate: mockLogout }),
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
  onOrgClick: jest.fn(),
  onUserClick: jest.fn(),
};

const renderProfileMenu = (props: Partial<ProfileMenuProps> = {}) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.CurrentUser], userMock);
  queryClient.setQueryData([QueryKey.Organizations], [orgMock, org2Mock]);
  return render(
    <MemoryRouter>
      <FeatureFlagsProvider>
        <ServicesContextProvider {...queriesMock} client={queryClient}>
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

  it('shows the user name as trigger button text when no org is active', () => {
    renderProfileMenu();
    expect(screen.getByRole('button', { name: 'Test User' })).toBeInTheDocument();
  });

  it('shows org context text when an org is active', () => {
    renderProfileMenu({ currentUserOrg: 'ttd' });
    expect(
      screen.getByRole('button', {
        name: textMock('shared.header_user_for_org', { user: 'Test User', org: 'Test org' }),
      }),
    ).toBeInTheDocument();
  });

  it('renders org menu items after opening the menu', async () => {
    const user = userEvent.setup();
    renderProfileMenu();
    await user.click(screen.getByRole('button', { name: 'Test User' }));
    expect(screen.getByRole('menuitemradio', { name: 'Test org' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: 'Skatteetaten' })).toBeInTheDocument();
  });

  it('calls onOrgClick when clicking an org menu item', async () => {
    const onOrgClick = jest.fn();
    const user = userEvent.setup();
    renderProfileMenu({ onOrgClick });
    await user.click(screen.getByRole('button', { name: 'Test User' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Test org' }));
    expect(onOrgClick).toHaveBeenCalledWith(orgMock);
  });

  it('calls onUserClick when clicking the user menu item', async () => {
    const onUserClick = jest.fn();
    const user = userEvent.setup();
    renderProfileMenu({ onUserClick });
    await user.click(screen.getByRole('button', { name: 'Test User' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Test User' }));
    expect(onUserClick).toHaveBeenCalledWith(userMock);
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
    expect(settingsLink).toHaveAttribute('href', expect.stringContaining('testuser'));
  });

  it('shows the settings link pointing to org path when studioOidc is enabled and org is active', async () => {
    const user = userEvent.setup();
    mockEnvironment.environment = { featureFlags: { studioOidc: true } };
    renderProfileMenu({ currentUserOrg: 'ttd' });
    await user.click(
      screen.getByRole('button', {
        name: textMock('shared.header_user_for_org', { user: 'Test User', org: 'Test org' }),
      }),
    );
    const settingsLink = screen.getByRole('menuitem', { name: textMock('settings') });
    expect(settingsLink).toHaveAttribute('href', expect.stringContaining('ttd'));
  });

  it('renders the logout button', async () => {
    const user = userEvent.setup();
    renderProfileMenu();
    await user.click(screen.getByRole('button', { name: 'Test User' }));
    expect(
      screen.getByRole('menuitemradio', { name: textMock('shared.header_logout') }),
    ).toBeInTheDocument();
  });
});
