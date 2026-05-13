import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PageLayout } from './PageLayout';
import { renderWithProviders } from '../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { user as userMock } from 'app-shared/mocks/mocks';
import { DISPLAY_NAME } from 'app-shared/constants';
import { useMediaQuery } from '@studio/hooks';
import { useFeatureFlag } from '@studio/feature-flags';
import { useEnvironmentConfig } from 'app-shared/contexts/EnvironmentConfigContext';
import { Route, Routes } from 'react-router-dom';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Outlet: () => <div>Outlet</div>,
  useNavigate: () => mockNavigate,
}));
jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: jest.fn(() => ({ environment: {} })),
}));
jest.mock('@studio/hooks', () => ({
  ...jest.requireActual('@studio/hooks'),
  useMediaQuery: jest.fn(),
}));
jest.mock('@studio/feature-flags', () => ({
  ...jest.requireActual('@studio/feature-flags'),
  useFeatureFlag: jest.fn(),
}));

const userWithName = { ...userMock, login: 'test', full_name: 'test' };

const organizationsMock = [
  { username: 'ttd', full_name: 'The TTD org', avatar_url: '', id: 1 },
  { username: 'skd', full_name: '', avatar_url: '', id: 2 },
];

type RenderOptions = {
  initialEntries?: string[];
  currentUser?: typeof userWithName;
  organizations?: typeof organizationsMock;
};

const renderPageLayout = ({
  initialEntries = ['/test'],
  currentUser = userWithName,
  organizations = organizationsMock,
}: RenderOptions = {}) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.CurrentUser], currentUser);
  queryClient.setQueryData([QueryKey.Organizations], organizations);
  return renderWithProviders(
    <Routes>
      <Route path='/:owner/*' element={<PageLayout />} />
    </Routes>,
    { queryClient, initialEntries },
  );
};

describe('PageLayout', () => {
  const mockEnvironmentConfig = (studioOidc: boolean) =>
    jest.mocked(useEnvironmentConfig).mockReturnValue({
      environment: { featureFlags: { studioOidc } },
      isPending: false,
      error: null,
    });

  beforeEach(() => {
    (useMediaQuery as jest.Mock).mockReturnValue(false);
    (useFeatureFlag as jest.Mock).mockReturnValue(false);
    mockEnvironmentConfig(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('renders the app title in the header', () => {
    renderPageLayout();
    expect(screen.getByText(DISPLAY_NAME)).toBeInTheDocument();
  });

  it('renders the Outlet', () => {
    renderPageLayout();
    expect(screen.getByText('Outlet')).toBeInTheDocument();
  });

  it('renders the profile menu trigger with user full name on the user page', () => {
    renderPageLayout();
    expect(screen.getByRole('button', { name: userWithName.full_name })).toBeInTheDocument();
  });

  it('renders the profile menu trigger with user and org name on an org page', () => {
    renderPageLayout({ initialEntries: ['/ttd/contact-points'] });
    expect(
      screen.getByRole('button', {
        name: textMock('shared.header_user_for_org', {
          user: userWithName.full_name,
          org: organizationsMock[0].full_name,
        }),
      }),
    ).toBeInTheDocument();
  });

  it('renders the profile menu trigger with login when full name is empty', () => {
    renderPageLayout({
      currentUser: { ...userMock, full_name: '', login: 'test' },
      organizations: [],
    });
    expect(screen.getByRole('button', { name: 'test' })).toBeInTheDocument();
  });

  it('renders the logout menu item', async () => {
    const user = userEvent.setup();
    renderPageLayout();
    await user.click(screen.getByRole('button', { name: userWithName.full_name }));
    expect(screen.getByText(textMock('shared.header_logout'))).toBeInTheDocument();
  });

  it('renders the user profile menu item', async () => {
    const user = userEvent.setup();
    renderPageLayout();
    await user.click(screen.getByRole('button', { name: userWithName.full_name }));
    expect(screen.getByRole('menuitemradio', { name: userWithName.full_name })).toBeInTheDocument();
  });

  it('renders organization menu items', async () => {
    const user = userEvent.setup();
    renderPageLayout();
    await user.click(screen.getByRole('button', { name: userWithName.full_name }));
    expect(screen.getByText(organizationsMock[0].full_name)).toBeInTheDocument();
    expect(screen.getByText(organizationsMock[1].username)).toBeInTheDocument();
  });

  it('navigates to user page when clicking user menu item from an org route', async () => {
    const user = userEvent.setup();
    renderPageLayout({ initialEntries: ['/ttd/contact-points'] });
    await user.click(
      screen.getByRole('button', {
        name: textMock('shared.header_user_for_org', {
          user: userWithName.full_name,
          org: organizationsMock[0].full_name,
        }),
      }),
    );
    await user.click(screen.getByRole('menuitemradio', { name: userWithName.full_name }));
    expect(mockNavigate).toHaveBeenCalledWith('/test');
  });

  it('navigates to org settings page when clicking org menu item', async () => {
    const user = userEvent.setup();
    renderPageLayout();
    await user.click(screen.getByRole('button', { name: userWithName.full_name }));
    await user.click(screen.getByRole('menuitemradio', { name: organizationsMock[0].full_name }));
    expect(mockNavigate).toHaveBeenCalledWith(`/${organizationsMock[0].username}`);
  });

  it('preserves the active sub-path when switching org', async () => {
    const user = userEvent.setup();
    renderPageLayout({ initialEntries: ['/ttd/contact-points'] });
    await user.click(
      screen.getByRole('button', {
        name: textMock('shared.header_user_for_org', {
          user: userWithName.full_name,
          org: organizationsMock[0].full_name,
        }),
      }),
    );
    await user.click(screen.getByRole('menuitemradio', { name: organizationsMock[1].username }));
    expect(mockNavigate).toHaveBeenCalledWith(`/${organizationsMock[1].username}/contact-points`);
  });

  it('drops org-only sub-path when switching from org to user', async () => {
    const user = userEvent.setup();
    renderPageLayout({ initialEntries: ['/ttd/bot-accounts'] });
    await user.click(
      screen.getByRole('button', {
        name: textMock('shared.header_user_for_org', {
          user: userWithName.full_name,
          org: organizationsMock[0].full_name,
        }),
      }),
    );
    await user.click(screen.getByRole('menuitemradio', { name: userWithName.full_name }));
    expect(mockNavigate).toHaveBeenCalledWith(`/${userWithName.login}`);
  });

  it('drops user-only sub-path when switching from user to org', async () => {
    const user = userEvent.setup();
    renderPageLayout({ initialEntries: ['/test/api-keys'] });
    await user.click(screen.getByRole('button', { name: userWithName.full_name }));
    await user.click(screen.getByRole('menuitemradio', { name: organizationsMock[0].full_name }));
    expect(mockNavigate).toHaveBeenCalledWith(`/${organizationsMock[0].username}`);
  });

  it('renders the dashboard header link using the active org', () => {
    renderPageLayout({ initialEntries: ['/ttd/contact-points'] });
    expect(
      screen.getByRole('link', { name: textMock('dashboard.header_item_dashboard') }),
    ).toHaveAttribute('href', '/dashboard/app-dashboard/ttd');
  });

  it('renders the library header link using the active org', () => {
    renderPageLayout({ initialEntries: ['/ttd/contact-points'] });
    expect(
      screen.getByRole('link', { name: textMock('dashboard.header_item_library') }),
    ).toHaveAttribute('href', '/dashboard/org-library/ttd');
  });

  it('does not render the dashboard link in the profile menu', async () => {
    const user = userEvent.setup();
    renderPageLayout({ initialEntries: ['/test'] });
    await user.click(screen.getByRole('button', { name: userWithName.full_name }));
    expect(
      screen.queryByRole('menuitem', { name: textMock('dashboard.header_item_dashboard') }),
    ).not.toBeInTheDocument();
  });

  it('shows settings when admin flag is enabled and studioOidc is disabled', async () => {
    const user = userEvent.setup();
    (useFeatureFlag as jest.Mock).mockReturnValue(true);
    mockEnvironmentConfig(false);

    renderPageLayout({ initialEntries: ['/test'] });
    await user.click(screen.getByRole('button', { name: userWithName.full_name }));

    const settingsLink = screen.getByRole('menuitem', { name: textMock('settings') });
    expect(settingsLink).toBeInTheDocument();
    expect(settingsLink).toHaveAttribute('href', '/settings/test');
  });
});
