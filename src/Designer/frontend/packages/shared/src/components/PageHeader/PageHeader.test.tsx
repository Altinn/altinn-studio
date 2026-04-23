import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { PageHeader } from './PageHeader';
import { useMediaQuery } from '@studio/hooks';
import type { AltinnStudioEnvironment } from 'app-shared/utils/altinnStudioEnv';
import { FeatureFlagsProvider } from '@studio/feature-flags';
import { DISPLAY_NAME } from 'app-shared/constants';

const mockEnvironment: {
  environment: AltinnStudioEnvironment | null;
  isLoading: boolean;
  error: null;
} = { environment: null, isLoading: false, error: null };
const mockLogout = jest.fn();
const mockOrgSelect = jest.fn();
const mockUserSelect = jest.fn();

const organizationsMock = [
  { username: 'ttd', full_name: 'Testdepartementet', avatar_url: '', id: 1 },
  { username: 'skd', full_name: 'Skatteetaten', avatar_url: '', id: 2 },
];

const mockUser = {
  avatar_url: '',
  email: 'test@test.no',
  full_name: 'Test Testersen',
  id: 11,
  login: 'test',
  userType: 1,
};

jest.mock('@studio/hooks', () => ({
  ...jest.requireActual('@studio/hooks'),
  useMediaQuery: jest.fn(),
}));

jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: () => mockEnvironment,
}));

jest.mock('app-shared/hooks/mutations/useLogoutMutation', () => ({
  useLogoutMutation: () => ({ mutate: mockLogout }),
}));

jest.mock('app-shared/hooks/queries', () => ({
  ...jest.requireActual('app-shared/hooks/queries'),
  useOrganizationsQuery: () => ({ data: organizationsMock }),
  useUserQuery: () => ({ data: mockUser }),
}));

const triggerButtonName = textMock('shared.header_user_for_org', {
  user: mockUser.full_name,
  org: organizationsMock[0].full_name,
});

describe('PageHeader', () => {
  beforeEach(() => {
    (useMediaQuery as jest.Mock).mockReturnValue(false);
    mockEnvironment.environment = null;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders the app title in the header', () => {
    renderPageHeader();
    expect(screen.getByText(DISPLAY_NAME)).toBeInTheDocument();
  });

  it('includes the user settings link in the profile menu when studioOidc is enabled', async () => {
    const user = userEvent.setup();
    mockEnvironment.environment = { featureFlags: { studioOidc: true } };

    renderPageHeader();

    await user.click(screen.getByRole('button', { name: triggerButtonName }));

    const settingsLink = screen.getByRole('menuitem', { name: textMock('settings') });

    expect(settingsLink).toHaveAttribute('href', '/settings/ttd');
    expect(
      screen.getByRole('menuitemradio', { name: textMock('shared.header_logout') }),
    ).toBeInTheDocument();
  });

  it('does not include the user settings link in the profile menu when studioOidc is disabled', async () => {
    const user = userEvent.setup();
    mockEnvironment.environment = { featureFlags: { studioOidc: false } };

    renderPageHeader();

    await user.click(screen.getByRole('button', { name: triggerButtonName }));

    expect(screen.queryByRole('menuitem', { name: textMock('settings') })).not.toBeInTheDocument();
  });

  it('renders org menu items in the profile menu', async () => {
    const user = userEvent.setup();
    renderPageHeader();

    await user.click(screen.getByRole('button', { name: triggerButtonName }));

    expect(screen.getByRole('menuitemradio', { name: 'Testdepartementet' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: 'Skatteetaten' })).toBeInTheDocument();
  });

  it('calls onOrgSelect with the org when clicking an org menu item', async () => {
    const user = userEvent.setup();
    renderPageHeader();

    await user.click(screen.getByRole('button', { name: triggerButtonName }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Skatteetaten' }));

    expect(mockOrgSelect).toHaveBeenCalledWith(organizationsMock[1]);
  });

  it('calls onUserSelect with the user when clicking the user menu item', async () => {
    const user = userEvent.setup();
    renderPageHeader();

    await user.click(screen.getByRole('button', { name: triggerButtonName }));
    await user.click(screen.getByRole('menuitemradio', { name: mockUser.full_name }));

    expect(mockUserSelect).toHaveBeenCalledWith(mockUser);
  });
});

const renderPageHeader = (initialEntries?: string[]) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <FeatureFlagsProvider>
        <PageHeader owner='ttd' onOrgSelect={mockOrgSelect} onUserSelect={mockUserSelect} />
      </FeatureFlagsProvider>
    </MemoryRouter>,
  );
