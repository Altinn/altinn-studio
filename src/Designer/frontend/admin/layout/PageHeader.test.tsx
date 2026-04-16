import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { PageHeader } from './PageHeader';
import { useMediaQuery } from '@studio/hooks';
import type { AltinnStudioEnvironment } from 'app-shared/utils/altinnStudioEnv';
import { FeatureFlagsProvider } from '@studio/feature-flags';
import { OrgContext } from './PageLayout';

const mockEnvironment: {
  environment: AltinnStudioEnvironment | null;
  isLoading: boolean;
  error: null;
} = { environment: null, isLoading: false, error: null };
const mockLogout = jest.fn();
const mockNavigate = jest.fn();

const organizationsMock = [
  { username: 'ttd', full_name: 'Testdepartementet', avatar_url: '', id: 1 },
  { username: 'skd', full_name: 'Skatteetaten', avatar_url: '', id: 2 },
];

const orgMock = { username: 'ttd', full_name: 'Testdepartementet', avatar_url: '', id: 1 };
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

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ org: 'ttd' }),
  useNavigate: () => mockNavigate,
}));

describe('PageHeader', () => {
  beforeEach(() => {
    (useMediaQuery as jest.Mock).mockReturnValue(false);
    mockEnvironment.environment = null;
    window.history.pushState({}, '', '/ttd/apps');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('includes the user settings link in the profile menu when studioOidc is enabled', async () => {
    const user = userEvent.setup();
    mockEnvironment.environment = { featureFlags: { studioOidc: true } };

    renderPageHeader();

    await user.click(screen.getByRole('button', { name: 'Test Testersen' }));

    const settingsLink = screen.getByRole('menuitem', { name: textMock('settings') });

    expect(settingsLink).toHaveAttribute('href', '/settings/user');
    expect(
      screen.getByRole('menuitemradio', { name: textMock('shared.header_logout') }),
    ).toBeInTheDocument();
  });

  it('does not include the user settings link in the profile menu when studioOidc is disabled', async () => {
    const user = userEvent.setup();
    mockEnvironment.environment = { featureFlags: { studioOidc: false } };

    renderPageHeader();

    await user.click(screen.getByRole('button', { name: 'Test Testersen' }));

    expect(screen.queryByRole('menuitem', { name: textMock('settings') })).not.toBeInTheDocument();
  });

  it('renders org menu items in the profile menu', async () => {
    const user = userEvent.setup();
    renderPageHeader();

    await user.click(screen.getByRole('button', { name: 'Test Testersen' }));

    expect(screen.getByRole('menuitemradio', { name: 'Testdepartementet' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: 'Skatteetaten' })).toBeInTheDocument();
  });

  it('navigates to org admin page when clicking org menu item', async () => {
    const user = userEvent.setup();
    renderPageHeader();

    await user.click(screen.getByRole('button', { name: 'Test Testersen' }));

    await user.click(screen.getByRole('menuitemradio', { name: 'Skatteetaten' }));
    expect(mockNavigate).toHaveBeenCalledWith('/skd/apps');
  });

  it('navigates to root when clicking user menu item', async () => {
    const user = userEvent.setup();
    renderPageHeader();

    await user.click(screen.getByRole('button', { name: 'Test Testersen' }));

    await user.click(screen.getByRole('menuitemradio', { name: 'Test Testersen' }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('preserves the active sub-path when switching org', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/ttd/apps/at22/my-app']}>
        <FeatureFlagsProvider>
          <OrgContext.Provider value={orgMock}>
            <PageHeader />
          </OrgContext.Provider>
        </FeatureFlagsProvider>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Test Testersen' }));

    await user.click(screen.getByRole('menuitemradio', { name: 'Skatteetaten' }));
    expect(mockNavigate).toHaveBeenCalledWith('/skd/apps/at22/my-app');
  });
});

const renderPageHeader = () =>
  render(
    <MemoryRouter>
      <FeatureFlagsProvider>
        <OrgContext.Provider value={orgMock}>
          <PageHeader />
        </OrgContext.Provider>
      </FeatureFlagsProvider>
    </MemoryRouter>,
  );
