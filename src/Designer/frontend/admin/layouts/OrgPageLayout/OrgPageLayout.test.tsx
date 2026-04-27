import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { OrgPageLayout } from './OrgPageLayout';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Outlet: () => <div>Outlet</div>,
}));

const userMock = {
  avatar_url: '',
  email: '',
  full_name: 'Test User',
  id: 1,
  login: 'testuser',
  userType: 0,
};
const orgMock = { username: 'ttd', full_name: 'Test org', avatar_url: '', id: 1 };

const RoutedOrgPageLayout = () => (
  <Routes>
    <Route path=':owner/*' element={<OrgPageLayout />} />
  </Routes>
);

type RenderOptions = {
  initialEntries?: string[];
  queries?: Record<string, unknown>;
  seedOrganizations?: boolean;
};

const renderOrgPageLayout = ({
  initialEntries = ['/ttd/apps'],
  queries = {},
  seedOrganizations = true,
}: RenderOptions = {}) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.CurrentUser], userMock);
  if (seedOrganizations) {
    queryClient.setQueryData([QueryKey.Organizations], [orgMock]);
  }
  return renderWithProviders(<RoutedOrgPageLayout />, { queryClient, queries, initialEntries });
};

describe('OrgPageLayout', () => {
  it('renders the outlet when org is found', () => {
    renderOrgPageLayout();
    expect(screen.getByText('Outlet')).toBeInTheDocument();
  });

  it('renders the loading spinner while data is pending', () => {
    renderOrgPageLayout({
      queries: { getOrganizations: () => new Promise<never>(() => {}) },
      seedOrganizations: false,
    });
    expect(screen.getByRole('img', { name: textMock('general.loading') })).toBeInTheDocument();
  });

  it('renders the error page when the organizations query fails', async () => {
    renderOrgPageLayout({
      queries: { getOrganizations: () => Promise.reject(new Error('failed')) },
      seedOrganizations: false,
    });
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: textMock('general.page_error_title') }),
      ).toBeInTheDocument();
    });
  });

  it('renders the not-found page when org is not in the list', () => {
    renderOrgPageLayout({ initialEntries: ['/unknown-org/apps'] });
    expect(
      screen.getByRole('heading', { name: textMock('not_found_page.heading') }),
    ).toBeInTheDocument();
  });

  it('renders NoOrgSelected when user login equals org parameter', () => {
    renderOrgPageLayout({ initialEntries: ['/testuser/apps'] });
    expect(screen.getByText(textMock('admin.apps.alert_no_org_selected'))).toBeInTheDocument();
  });
});
