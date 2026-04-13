import { screen, waitFor } from '@testing-library/react';
import { PageLayout } from './PageLayout';
import { renderWithProviders } from '../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { QueryClient } from '@tanstack/react-query';

jest.mock('../components/Menu/Menu', () => ({ Menu: () => <div>Menu</div> }));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Outlet: () => <div>Outlet</div>,
}));

const testOrg = 'ttd';
const organizationsMock = [
  {
    username: testOrg,
    full_name: 'Test org',
    avatar_url: '',
    id: 1,
  },
];

describe('PageLayout', () => {
  let queryClient: QueryClient;

  const renderPageLayout = (initialEntries = ['/orgs/ttd/contact-points']) =>
    renderWithProviders(<PageLayout />, { initialEntries, queryClient });

  beforeEach(() => {
    queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.Organizations], organizationsMock);
    queryClient.setQueryData([QueryKey.UserOrgPermissions, testOrg], {
      canCreateOrgRepo: true,
      isOrgOwner: true,
    });
  });

  it('renders the settings heading', () => {
    renderPageLayout();
    expect(screen.getByText(textMock('settings.orgs.heading'))).toBeInTheDocument();
    expect(screen.getByText(textMock('settings.orgs.heading.description'))).toBeInTheDocument();
  });

  it('renders the Menu', () => {
    renderPageLayout();
    expect(screen.getByText('Menu')).toBeInTheDocument();
  });

  it('renders the Outlet', () => {
    renderPageLayout();
    expect(screen.getByText('Outlet')).toBeInTheDocument();
  });

  it('renders the loading spinner while data is pending', () => {
    const localQueryClient = createQueryClientMock();
    renderWithProviders(<PageLayout />, {
      initialEntries: ['/orgs/ttd/contact-points'],
      queryClient: localQueryClient,
      queries: { getOrganizations: () => new Promise<never>(() => {}) },
    });
    expect(screen.getByRole('img', { name: textMock('repo_status.loading') })).toBeInTheDocument();
  });

  it('renders the not-found page when org is not in the org list', () => {
    renderPageLayout(['/orgs/unknown-org/contact-points']);
    expect(
      screen.getByRole('heading', { name: textMock('not_found_page.heading') }),
    ).toBeInTheDocument();
  });

  it('renders the not-found page when there is no org in the path', () => {
    renderPageLayout(['/']);
    expect(
      screen.getByRole('heading', { name: textMock('not_found_page.heading') }),
    ).toBeInTheDocument();
  });

  it('renders the loading spinner while org permissions are pending', () => {
    const localQueryClient = createQueryClientMock();
    localQueryClient.setQueryData([QueryKey.Organizations], organizationsMock);
    renderWithProviders(<PageLayout />, {
      initialEntries: ['/orgs/ttd/contact-points'],
      queryClient: localQueryClient,
      queries: { getUserOrgPermissions: () => new Promise<never>(() => {}) },
    });
    expect(screen.getByRole('img', { name: textMock('repo_status.loading') })).toBeInTheDocument();
  });

  it('renders error page when organizations query fails', async () => {
    const localQueryClient = createQueryClientMock();
    renderWithProviders(<PageLayout />, {
      initialEntries: ['/orgs/ttd/contact-points'],
      queryClient: localQueryClient,
      queries: { getOrganizations: () => Promise.reject(new Error('error')) },
    });
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: textMock('settings.orgs.heading') }),
      ).not.toBeInTheDocument();
    });
  });

  it('renders error page when org permissions query fails', async () => {
    const localQueryClient = createQueryClientMock();
    localQueryClient.setQueryData([QueryKey.Organizations], organizationsMock);
    renderWithProviders(<PageLayout />, {
      initialEntries: ['/orgs/ttd/contact-points'],
      queryClient: localQueryClient,
      queries: { getUserOrgPermissions: () => Promise.reject(new Error('error')) },
    });
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: textMock('settings.orgs.heading') }),
      ).not.toBeInTheDocument();
    });
  });

  it('renders not-found page when org is not in the list and permissions are pending', () => {
    renderPageLayout(['/orgs/unknown-org/contact-points']);
    expect(
      screen.getByRole('heading', { name: textMock('not_found_page.heading') }),
    ).toBeInTheDocument();
  });

  it('renders not-org-owner alert when user is not owner for selected org', () => {
    queryClient.setQueryData([QueryKey.UserOrgPermissions, testOrg], {
      canCreateOrgRepo: true,
      isOrgOwner: false,
    });
    renderPageLayout();
    expect(
      screen.getByText(
        textMock('settings.orgs.not_org_owner_alert', {
          orgName: organizationsMock[0].full_name,
        }),
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Menu')).not.toBeInTheDocument();
    expect(screen.queryByText('Outlet')).not.toBeInTheDocument();
  });

  it('renders not-org-owner alert using username when org has no full name', () => {
    const orgWithoutFullName = { username: testOrg, full_name: '', avatar_url: '', id: 1 };
    queryClient.setQueryData([QueryKey.Organizations], [orgWithoutFullName]);
    queryClient.setQueryData([QueryKey.UserOrgPermissions, testOrg], {
      canCreateOrgRepo: true,
      isOrgOwner: false,
    });
    renderPageLayout();
    expect(
      screen.getByText(textMock('settings.orgs.not_org_owner_alert', { orgName: testOrg })),
    ).toBeInTheDocument();
  });
});
