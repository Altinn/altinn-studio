import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { OrgPageLayout } from './OrgPageLayout';
import { renderWithProviders } from '../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { user as userMock } from 'app-shared/mocks/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

jest.mock('../../features/orgs/layout/PageLayout', () => ({
  PageLayout: () => <div>PageLayout</div>,
}));
jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: () => ({ environment: {} }),
}));

const orgUser = { ...userMock, login: 'testuser' };

const RoutedOrgPageLayout = () => (
  <Routes>
    <Route path=':owner/*' element={<OrgPageLayout />} />
  </Routes>
);

type RenderOptions = {
  initialEntries?: string[];
  queries?: Record<string, unknown>;
  seedCurrentUser?: boolean;
};

const renderOrgPageLayout = ({
  initialEntries = ['/ttd/bot-accounts'],
  queries = {},
  seedCurrentUser = true,
}: RenderOptions = {}) => {
  const queryClient = createQueryClientMock();
  if (seedCurrentUser) {
    queryClient.setQueryData([QueryKey.CurrentUser], orgUser);
  }
  return renderWithProviders(<RoutedOrgPageLayout />, { initialEntries, queryClient, queries });
};

describe('OrgPageLayout', () => {
  it('renders PageLayout when owner is an org (not the logged-in user)', () => {
    renderOrgPageLayout({ initialEntries: ['/ttd/bot-accounts'] });
    expect(screen.getByText('PageLayout')).toBeInTheDocument();
  });

  it('renders the not-found page when owner matches the logged-in user login', () => {
    renderOrgPageLayout({ initialEntries: ['/testuser/bot-accounts'] });
    expect(
      screen.getByRole('heading', { name: textMock('not_found_page.heading') }),
    ).toBeInTheDocument();
  });

  it('renders the loading spinner while user data is still loading', () => {
    renderOrgPageLayout({
      initialEntries: ['/ttd/bot-accounts'],
      queries: { getUser: () => new Promise<never>(() => {}) },
      seedCurrentUser: false,
    });
    expect(screen.getByRole('img', { name: textMock('general.loading') })).toBeInTheDocument();
  });

  it('renders the error page when the user query fails', async () => {
    renderOrgPageLayout({
      initialEntries: ['/ttd/bot-accounts'],
      queries: { getUser: () => Promise.reject(new Error('failed')) },
      seedCurrentUser: false,
    });
    await screen.findByRole('heading', { name: textMock('general.page_error_title') });
  });
});
