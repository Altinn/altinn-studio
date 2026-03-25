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

const mockOrg: { value: string | undefined } = { value: 'ttd' };
jest.mock('app-shared/hooks/useStudioEnvironmentParams', () => ({
  useStudioEnvironmentParams: () => ({ org: mockOrg.value }),
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

const renderPageLayout = () => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.OrgList], orgsMock);
  queryClient.setQueryData([QueryKey.CurrentUser], userMock);
  return renderWithProviders(<PageLayout />, { queryClient });
};

describe('PageLayout', () => {
  beforeEach(() => {
    mockOrg.value = testOrg;
  });

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
    renderWithProviders(<PageLayout />, { queryClient });
    expect(screen.getByRole('img', { name: textMock('repo_status.loading') })).toBeInTheDocument();
  });

  it('renders the not-found page when org is not in the org list', () => {
    mockOrg.value = 'unknown-org';
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.OrgList], orgsMock);
    queryClient.setQueryData([QueryKey.CurrentUser], userMock);
    renderWithProviders(<PageLayout />, { queryClient });
    expect(screen.getByText(textMock('not_found_page.heading'))).toBeInTheDocument();
  });

  it('renders the not-found page when there is no org in the path', () => {
    mockOrg.value = undefined;
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.OrgList], orgsMock);
    queryClient.setQueryData([QueryKey.CurrentUser], userMock);
    renderWithProviders(<PageLayout />, { queryClient });
    expect(screen.getByText(textMock('not_found_page.heading'))).toBeInTheDocument();
  });

  it('does not render the settings heading when user data is missing', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.OrgList], orgsMock);
    queryClient.setQueryData([QueryKey.CurrentUser], undefined);
    renderWithProviders(<PageLayout />, { queryClient });
    expect(
      screen.queryByRole('heading', { name: textMock('org.settings.heading') }),
    ).not.toBeInTheDocument();
  });
});
