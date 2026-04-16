import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PageLayout } from './PageLayout';
import { renderWithProviders } from '../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { user as userMock } from 'app-shared/mocks/mocks';
import { DISPLAY_NAME } from 'app-shared/constants';
import { useMediaQuery } from '@studio/hooks';
import { useFeatureFlag } from '@studio/feature-flags';
import { Route, Routes } from 'react-router-dom';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Outlet: () => <div>Outlet</div>,
  useNavigate: () => mockNavigate,
}));
jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: () => ({ environment: {} }),
}));
jest.mock('@studio/hooks', () => ({
  ...jest.requireActual('@studio/hooks'),
  useMediaQuery: jest.fn(),
}));
jest.mock('@studio/feature-flags', () => ({
  ...jest.requireActual('@studio/feature-flags'),
  useFeatureFlag: jest.fn(),
}));

const userWithName = { ...userMock, full_name: 'Ola Nordmann' };

const organizationsMock = [
  { username: 'ttd', full_name: 'The TTD org', avatar_url: '', id: 1 },
  { username: 'skd', full_name: '', avatar_url: '', id: 2 },
];

const renderPageLayout = (initialEntries = ['/user']) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.CurrentUser], userWithName);
  queryClient.setQueryData([QueryKey.Organizations], organizationsMock);
  return renderWithProviders(
    <Routes>
      <Route path='/user/*' element={<PageLayout />} />
      <Route path='/orgs/:org/*' element={<PageLayout />} />
    </Routes>,
    { queryClient, initialEntries },
  );
};

describe('PageLayout', () => {
  beforeEach(() => {
    (useMediaQuery as jest.Mock).mockReturnValue(false);
    (useFeatureFlag as jest.Mock).mockReturnValue(false);
  });

  afterEach(() => jest.clearAllMocks());

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
    renderPageLayout(['/orgs/ttd/contact-points']);
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
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CurrentUser], {
      ...userMock,
      full_name: '',
      login: 'olanordmann',
    });
    queryClient.setQueryData([QueryKey.Organizations], []);
    renderWithProviders(
      <Routes>
        <Route path='/user/*' element={<PageLayout />} />
      </Routes>,
      { queryClient, initialEntries: ['/user'] },
    );
    expect(screen.getByRole('button', { name: 'olanordmann' })).toBeInTheDocument();
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

  it('navigates to user page when clicking user menu item', async () => {
    const user = userEvent.setup();
    renderPageLayout();
    await user.click(screen.getByRole('button', { name: userWithName.full_name }));
    await user.click(screen.getByRole('menuitemradio', { name: userWithName.full_name }));
    expect(mockNavigate).toHaveBeenCalledWith('/user');
  });

  it('navigates to org settings page when clicking org menu item', async () => {
    const user = userEvent.setup();
    renderPageLayout();
    await user.click(screen.getByRole('button', { name: userWithName.full_name }));
    await user.click(screen.getByRole('menuitemradio', { name: organizationsMock[0].full_name }));
    expect(mockNavigate).toHaveBeenCalledWith(`/orgs/${organizationsMock[0].username}`);
  });

  it('preserves the active sub-path when switching org', async () => {
    const user = userEvent.setup();
    renderPageLayout(['/orgs/ttd/contact-points']);
    await user.click(
      screen.getByRole('button', {
        name: textMock('shared.header_user_for_org', {
          user: userWithName.full_name,
          org: organizationsMock[0].full_name,
        }),
      }),
    );
    await user.click(screen.getByRole('menuitemradio', { name: organizationsMock[1].username }));
    expect(mockNavigate).toHaveBeenCalledWith(
      `/orgs/${organizationsMock[1].username}/contact-points`,
    );
  });

  it('renders the dashboard header link using self context when no org is active', () => {
    renderPageLayout(['/user']);
    expect(
      screen.getByRole('link', { name: textMock('dashboard.header_item_dashboard') }),
    ).toHaveAttribute('href', '/dashboard/app-dashboard/self');
  });

  it('renders the dashboard header link using the active org', () => {
    renderPageLayout(['/orgs/ttd/contact-points']);
    expect(
      screen.getByRole('link', { name: textMock('dashboard.header_item_dashboard') }),
    ).toHaveAttribute('href', '/dashboard/app-dashboard/ttd');
  });

  it('does not render the published apps header link when Admin flag is disabled', () => {
    renderPageLayout(['/orgs/ttd/contact-points']);
    expect(
      screen.queryByRole('link', { name: textMock('admin.apps.title') }),
    ).not.toBeInTheDocument();
  });

  it('renders the published apps header link using the active org when Admin flag is enabled', () => {
    (useFeatureFlag as jest.Mock).mockReturnValue(true);
    renderPageLayout(['/orgs/ttd/contact-points']);
    expect(screen.getByRole('link', { name: textMock('admin.apps.title') })).toHaveAttribute(
      'href',
      '/admin/ttd',
    );
  });

  it('renders the library header link using the active org', () => {
    renderPageLayout(['/orgs/ttd/contact-points']);
    expect(
      screen.getByRole('link', { name: textMock('dashboard.header_item_library') }),
    ).toHaveAttribute('href', '/dashboard/org-library/ttd');
  });

  it('does not render the dashboard link in the profile menu', async () => {
    const user = userEvent.setup();
    renderPageLayout(['/user']);
    await user.click(screen.getByRole('button', { name: userWithName.full_name }));
    expect(
      screen.queryByRole('menuitem', { name: textMock('dashboard.header_item_dashboard') }),
    ).not.toBeInTheDocument();
  });

  it('does not render the settings menu item when studioOidc is disabled', async () => {
    const user = userEvent.setup();
    renderPageLayout();
    await user.click(screen.getByRole('button', { name: userWithName.full_name }));
    expect(screen.queryByText(textMock('settings'))).not.toBeInTheDocument();
  });

  it('renders the settings menu item when studioOidc is enabled', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CurrentUser], userWithName);
    queryClient.setQueryData([QueryKey.Organizations], []);
    jest
      .spyOn(require('app-shared/contexts/EnvironmentConfigContext'), 'useEnvironmentConfig')
      .mockReturnValue({ environment: { featureFlags: { studioOidc: true } } });
    renderWithProviders(
      <Routes>
        <Route path='/user/*' element={<PageLayout />} />
      </Routes>,
      { queryClient, initialEntries: ['/user'] },
    );
    await user.click(screen.getByRole('button', { name: userWithName.full_name }));
    expect(screen.getByText(textMock('settings'))).toBeInTheDocument();
    jest.restoreAllMocks();
  });
});
