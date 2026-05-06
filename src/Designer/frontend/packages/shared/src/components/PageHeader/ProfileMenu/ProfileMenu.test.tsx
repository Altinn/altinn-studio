import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { AltinnStudioEnvironment } from 'app-shared/utils/altinnStudioEnv';
import type { Organization } from 'app-shared/types/Organization';
import type { User } from 'app-shared/types/Repository';
import { ProfileMenu } from './ProfileMenu';
import { FeatureFlag, FeatureFlagsContextProvider } from '@studio/feature-flags';

const mockLogout = jest.fn();
const mockOnOrgSelect = jest.fn();
const mockOnUserSelect = jest.fn();
const mockEnvironment: { environment: AltinnStudioEnvironment | null } = { environment: null };

const mockUseUserQuery = jest.fn();
const mockUseOrganizationsQuery = jest.fn();

jest.mock('app-shared/hooks/queries', () => ({
  ...jest.requireActual('app-shared/hooks/queries'),
  useUserQuery: () => mockUseUserQuery(),
  useOrganizationsQuery: () => mockUseOrganizationsQuery(),
}));

jest.mock('app-shared/hooks/mutations/useLogoutMutation', () => ({
  useLogoutMutation: () => ({ mutate: mockLogout }),
}));

jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: () => mockEnvironment,
}));

const userWithFullName: User = {
  avatar_url: '',
  email: 'test@test.no',
  full_name: 'Test Testersen',
  id: 1,
  login: 'testuser',
  userType: 1,
};

const userWithoutFullName: User = {
  ...userWithFullName,
  full_name: '',
};

const orgWithFullName: Organization = {
  avatar_url: '',
  description: '',
  full_name: 'Tax Authority',
  id: 10,
  location: '',
  username: 'skatt',
  website: '',
};

const orgWithoutFullName: Organization = {
  ...orgWithFullName,
  full_name: '',
};

type RenderOptions = {
  owner?: string;
  user?: User | null;
  organizations?: Organization[];
  shouldDisplayDesktopMenu?: boolean;
  featureFlags?: FeatureFlag[];
};

const renderProfileMenu = ({
  owner = 'testuser',
  user = userWithFullName,
  organizations = [],
  shouldDisplayDesktopMenu = false,
  featureFlags = [],
}: RenderOptions = {}) => {
  mockUseUserQuery.mockReturnValue({ data: user ?? undefined });
  mockUseOrganizationsQuery.mockReturnValue({ data: organizations });
  return render(
    <FeatureFlagsContextProvider value={{ flags: featureFlags }}>
      <MemoryRouter>
        <ProfileMenu
          owner={owner}
          navigationMenuItems={[]}
          shouldDisplayDesktopMenu={shouldDisplayDesktopMenu}
          onOrgSelect={mockOnOrgSelect}
          onUserSelect={mockOnUserSelect}
        />
      </MemoryRouter>
    </FeatureFlagsContextProvider>,
  );
};

const getTriggerButton = (name?: string | RegExp) =>
  screen.getByRole('button', { name: name ?? textMock('top_menu.menu') });

describe('ProfileMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when user data is not loaded', () => {
    renderProfileMenu({ user: null });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('uses user login as name when full_name is empty', async () => {
    const user = userEvent.setup();
    renderProfileMenu({ user: userWithoutFullName });
    await user.click(getTriggerButton());
    expect(screen.getByRole('menuitem', { name: userWithoutFullName.login })).toBeInTheDocument();
  });

  it('uses org username as item name when org full_name is empty', async () => {
    const user = userEvent.setup();
    renderProfileMenu({ owner: 'skatt', organizations: [orgWithoutFullName] });
    await user.click(getTriggerButton());
    expect(screen.getByRole('menuitem', { name: orgWithoutFullName.username })).toBeInTheDocument();
  });

  it('marks the org as active when owner matches the org username', async () => {
    const user = userEvent.setup();
    renderProfileMenu({ owner: 'skatt', organizations: [orgWithFullName] });
    await user.click(getTriggerButton());
    expect(screen.getByRole('menuitem', { name: orgWithFullName.full_name })).toBeInTheDocument();
  });

  it('does not mark the org as active when owner is the logged-in user', async () => {
    const user = userEvent.setup();
    renderProfileMenu({ owner: 'testuser', organizations: [orgWithFullName] });
    await user.click(getTriggerButton());
    const item = screen.getByRole('menuitem', { name: orgWithFullName.full_name });
    expect(item).not.toHaveClass('active');
  });

  it('shows the user-for-org trigger text when an org is active', async () => {
    const user = userEvent.setup();
    renderProfileMenu({ owner: 'skatt', organizations: [orgWithFullName] });
    await user.click(getTriggerButton());
    expect(
      screen.getByText(
        textMock('shared.header_user_for_org', {
          user: userWithFullName.full_name,
          org: orgWithFullName.full_name,
        }),
      ),
    ).toBeInTheDocument();
  });

  it('shows only the username as trigger text when no org is active', async () => {
    const user = userEvent.setup();
    renderProfileMenu({ owner: 'testuser', organizations: [orgWithFullName] });
    await user.click(getTriggerButton());
    expect(screen.getByRole('menuitem', { name: userWithFullName.full_name })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: orgWithFullName.full_name })).toBeInTheDocument();
    expect(
      screen.queryByText(
        textMock('shared.header_user_for_org', {
          user: userWithFullName.full_name,
          org: orgWithFullName.full_name,
        }),
      ),
    ).not.toBeInTheDocument();
  });

  it('should include settings link when studioOidc is enabled', async () => {
    const user = userEvent.setup();
    mockEnvironment.environment = { featureFlags: { studioOidc: true } } as AltinnStudioEnvironment;

    renderProfileMenu();

    await user.click(getTriggerButton());

    expect(screen.getByRole('menuitem', { name: textMock('settings') })).toBeInTheDocument();
  });

  it('should include settings link when Admin feature flag is enabled', async () => {
    const user = userEvent.setup();
    mockEnvironment.environment = {
      featureFlags: { studioOidc: false },
    } as AltinnStudioEnvironment;

    renderProfileMenu({ featureFlags: [FeatureFlag.Admin] });

    await user.click(getTriggerButton());

    expect(screen.getByRole('menuitem', { name: textMock('settings') })).toBeInTheDocument();
  });

  it('should not include settings link when neither studioOidc nor Admin flag is enabled', async () => {
    const user = userEvent.setup();
    mockEnvironment.environment = {
      featureFlags: { studioOidc: false },
    } as AltinnStudioEnvironment;

    renderProfileMenu();

    await user.click(getTriggerButton());

    expect(screen.queryByRole('menuitem', { name: textMock('settings') })).not.toBeInTheDocument();
  });

  it('renders no org items when organizations data is unavailable', async () => {
    mockUseUserQuery.mockReturnValue({ data: userWithFullName });
    mockUseOrganizationsQuery.mockReturnValue({ data: undefined });
    const user = userEvent.setup();
    render(
      <FeatureFlagsContextProvider value={{ flags: [] }}>
        <MemoryRouter>
          <ProfileMenu
            owner='testuser'
            navigationMenuItems={[]}
            shouldDisplayDesktopMenu={false}
            onOrgSelect={mockOnOrgSelect}
            onUserSelect={mockOnUserSelect}
          />
        </MemoryRouter>
      </FeatureFlagsContextProvider>,
    );
    await user.click(getTriggerButton());
    expect(
      screen.queryByRole('menuitem', { name: orgWithFullName.full_name }),
    ).not.toBeInTheDocument();
  });
});
