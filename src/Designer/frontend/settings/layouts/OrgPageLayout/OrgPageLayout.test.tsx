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

const renderOrgPageLayout = (initialEntries = ['/ttd/bot-accounts'], queryOverrides = {}) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.CurrentUser], orgUser);
  return renderWithProviders(<RoutedOrgPageLayout />, {
    initialEntries,
    queryClient,
    ...queryOverrides,
  });
};

describe('OrgPageLayout', () => {
  it('renders PageLayout when owner is an org (not the logged-in user)', () => {
    renderOrgPageLayout(['/ttd/bot-accounts']);
    expect(screen.getByText('PageLayout')).toBeInTheDocument();
  });

  it('renders the not-found page when owner matches the logged-in user login', () => {
    renderOrgPageLayout(['/testuser/bot-accounts']);
    expect(
      screen.getByRole('heading', { name: textMock('not_found_page.heading') }),
    ).toBeInTheDocument();
  });

  it('renders PageLayout while user data is still loading', () => {
    const queryClient = createQueryClientMock();
    renderWithProviders(<RoutedOrgPageLayout />, {
      initialEntries: ['/testuser/bot-accounts'],
      queryClient,
      queries: { getUser: () => new Promise<never>(() => {}) },
    });
    expect(screen.getByText('PageLayout')).toBeInTheDocument();
  });
});
