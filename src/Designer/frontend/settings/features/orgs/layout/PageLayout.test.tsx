import { screen } from '@testing-library/react';
import { PageLayout } from './PageLayout';
import { renderWithProviders } from '../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { useOrganizationsQuery, useUserOrgPermissionsQuery } from 'app-shared/hooks/queries';

jest.mock('../components/Menu/Menu', () => ({ Menu: () => <div>Menu</div> }));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Outlet: () => <div>Outlet</div>,
}));
jest.mock('app-shared/hooks/queries', () => ({
  ...jest.requireActual('app-shared/hooks/queries'),
  useOrganizationsQuery: jest.fn(),
  useUserOrgPermissionsQuery: jest.fn(),
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

const renderPageLayout = (initialEntries = ['/orgs/ttd/contact-points']) => {
  return renderWithProviders(<PageLayout />, { initialEntries });
};

describe('PageLayout', () => {
  beforeEach(() => {
    jest.mocked(useOrganizationsQuery).mockReturnValue({
      data: organizationsMock,
      isPending: false,
      isError: false,
    } as ReturnType<typeof useOrganizationsQuery>);
    jest.mocked(useUserOrgPermissionsQuery).mockReturnValue({
      data: { canCreateOrgRepo: true, isOrgOwner: true },
      isPending: false,
      isError: false,
    } as ReturnType<typeof useUserOrgPermissionsQuery>);
  });

  afterEach(() => jest.clearAllMocks());

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
    jest.mocked(useOrganizationsQuery).mockReturnValueOnce({
      data: undefined,
      isPending: true,
      isError: false,
    } as ReturnType<typeof useOrganizationsQuery>);
    renderWithProviders(<PageLayout />, { initialEntries: ['/orgs/ttd/contact-points'] });
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

  it('renders error page when organizations query fails', () => {
    jest.mocked(useOrganizationsQuery).mockReturnValueOnce({
      data: undefined,
      isPending: false,
      isError: true,
    } as ReturnType<typeof useOrganizationsQuery>);
    renderPageLayout();
    expect(
      screen.queryByRole('heading', { name: textMock('settings.orgs.heading') }),
    ).not.toBeInTheDocument();
  });

  it('renders not-org-owner alert when user is not owner for selected org', () => {
    jest.mocked(useUserOrgPermissionsQuery).mockReturnValueOnce({
      data: { canCreateOrgRepo: true, isOrgOwner: false },
      isPending: false,
      isError: false,
    } as ReturnType<typeof useUserOrgPermissionsQuery>);
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
});
