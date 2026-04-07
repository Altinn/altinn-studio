import { screen } from '@testing-library/react';
import { PageLayout } from './PageLayout';
import { renderWithProviders } from '../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { Org } from 'app-shared/types/OrgList';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { user as userMock } from 'app-shared/mocks/mocks';
import { useUserQuery } from 'app-shared/hooks/queries';

jest.mock('../components/Menu/Menu', () => ({ Menu: () => <div>Menu</div> }));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Outlet: () => <div>Outlet</div>,
}));
jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: () => ({ environment: {} }),
}));
jest.mock('app-shared/hooks/queries', () => ({
  ...jest.requireActual('app-shared/hooks/queries'),
  useUserQuery: jest.fn(),
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

const renderPageLayout = (initialEntries = ['/orgs/ttd/contact-points']) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.OrgList], orgsMock);
  return renderWithProviders(<PageLayout />, { queryClient, initialEntries });
};

describe('PageLayout', () => {
  beforeEach(() => {
    jest.mocked(useUserQuery).mockReturnValue({
      data: userMock,
      isPending: false,
    } as ReturnType<typeof useUserQuery>);
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
    jest.mocked(useUserQuery).mockReturnValueOnce({
      data: undefined,
      isPending: true,
    } as ReturnType<typeof useUserQuery>);
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

  it('does not render the settings heading when user data is missing', () => {
    jest.mocked(useUserQuery).mockReturnValueOnce({
      data: undefined,
      isPending: false,
    } as ReturnType<typeof useUserQuery>);
    renderPageLayout();
    expect(
      screen.queryByRole('heading', { name: textMock('settings.orgs.heading') }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(textMock('settings.orgs.heading.description')),
    ).not.toBeInTheDocument();
  });

  it('renders the error page when org is valid but user data is missing after loading', () => {
    jest.mocked(useUserQuery).mockReturnValueOnce({
      data: undefined,
      isPending: false,
    } as ReturnType<typeof useUserQuery>);
    renderPageLayout();
    expect(screen.queryByText('Menu')).not.toBeInTheDocument();
    expect(screen.queryByText('Outlet')).not.toBeInTheDocument();
  });
});
