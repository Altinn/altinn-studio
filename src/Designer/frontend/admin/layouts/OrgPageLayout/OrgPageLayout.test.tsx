import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OrgPageLayout } from './OrgPageLayout';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { FeatureFlagsProvider } from '@studio/feature-flags';

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
    <Route path=':org/*' element={<OrgPageLayout />} />
  </Routes>
);

const renderOrgPageLayout = (initialEntries = ['/ttd/apps'], queries = {}) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.CurrentUser], userMock);
  queryClient.setQueryData([QueryKey.Organizations], [orgMock]);
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <FeatureFlagsProvider>
        <ServicesContextProvider {...queriesMock} {...queries} client={queryClient}>
          <RoutedOrgPageLayout />
        </ServicesContextProvider>
      </FeatureFlagsProvider>
    </MemoryRouter>,
  );
};

describe('OrgPageLayout', () => {
  it('renders the outlet when org is found', () => {
    renderOrgPageLayout();
    expect(screen.getByText('Outlet')).toBeInTheDocument();
  });

  it('renders the loading spinner while data is pending', () => {
    const queryClient = createQueryClientMock();
    render(
      <MemoryRouter initialEntries={['/ttd/apps']}>
        <FeatureFlagsProvider>
          <ServicesContextProvider
            {...queriesMock}
            getUser={() => new Promise<never>(() => {})}
            client={queryClient}
          >
            <RoutedOrgPageLayout />
          </ServicesContextProvider>
        </FeatureFlagsProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole('img', { name: textMock('repo_status.loading') })).toBeInTheDocument();
  });

  it('renders the error page when user is missing after loading', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CurrentUser], null);
    queryClient.setQueryData([QueryKey.Organizations], [orgMock]);
    render(
      <MemoryRouter initialEntries={['/ttd/apps']}>
        <FeatureFlagsProvider>
          <ServicesContextProvider {...queriesMock} client={queryClient}>
            <RoutedOrgPageLayout />
          </ServicesContextProvider>
        </FeatureFlagsProvider>
      </MemoryRouter>,
    );
    expect(screen.queryByText('Outlet')).not.toBeInTheDocument();
  });

  it('renders the not-found page when org is not in the list', () => {
    renderOrgPageLayout(['/unknown-org/apps']);
    expect(
      screen.getByRole('heading', { name: textMock('not_found_page.heading') }),
    ).toBeInTheDocument();
  });
});
