import { screen } from '@testing-library/react';
import { PageLayout } from './PageLayout';
import { renderWithProviders } from 'admin/testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { Org } from 'app-shared/types/OrgList';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { user as userMock } from 'app-shared/mocks/mocks';

jest.mock('../components/Menu/Menu', () => ({ Menu: () => <div>Menu</div> }));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Outlet: () => <div>Outlet</div>,
}));
jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: () => ({ environment: {} }),
}));

const testOrg = 'ttd';
const orgsMock: KeyValuePairs<Org> = {
  [testOrg]: {
    name: { nb: 'Test org' },
    logo: '',
    orgnr: '123456789',
    homepage: '',
    environments: [],
  },
};

const renderPageLayout = (initialEntries = ['/ttd/settings']) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.OrgList], orgsMock);
  queryClient.setQueryData([QueryKey.CurrentUser], userMock);
  return renderWithProviders(<PageLayout />, { queryClient, initialEntries });
};

describe('PageLayout', () => {
  it('renders the settings heading', () => {
    renderPageLayout();
    expect(
      screen.getByRole('heading', { name: textMock('org.settings.heading') }),
    ).toBeInTheDocument();
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
    const queryClient = createQueryClientMock();
    renderWithProviders(<PageLayout />, { queryClient, initialEntries: ['/ttd/settings'] });
    expect(screen.getByRole('img', { name: textMock('repo_status.loading') })).toBeInTheDocument();
  });

  it('renders the not-found page when org is not in the org list', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.OrgList], orgsMock);
    queryClient.setQueryData([QueryKey.CurrentUser], userMock);
    renderWithProviders(<PageLayout />, { queryClient, initialEntries: ['/unknown-org/settings'] });
    expect(screen.getByText(textMock('not_found_page.heading'))).toBeInTheDocument();
  });

  it('renders the not-found page when there is no org in the path', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.OrgList], orgsMock);
    queryClient.setQueryData([QueryKey.CurrentUser], userMock);
    renderWithProviders(<PageLayout />, { queryClient, initialEntries: ['/'] });
    expect(screen.getByText(textMock('not_found_page.heading'))).toBeInTheDocument();
  });

  it('does not render the settings heading when user data is missing', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.OrgList], orgsMock);
    queryClient.setQueryData([QueryKey.CurrentUser], undefined);
    renderWithProviders(<PageLayout />, { queryClient, initialEntries: ['/ttd/settings'] });
    expect(
      screen.queryByRole('heading', { name: textMock('org.settings.heading') }),
    ).not.toBeInTheDocument();
  });
});
