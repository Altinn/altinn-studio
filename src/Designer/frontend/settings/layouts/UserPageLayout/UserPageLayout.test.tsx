import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { UserPageLayout } from './UserPageLayout';
import { renderWithProviders } from '../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { user as userMock } from 'app-shared/mocks/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

jest.mock('../../features/user/layout/PageLayout', () => ({
  PageLayout: () => <div>PageLayout</div>,
}));
jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: () => ({ environment: {} }),
}));

const loggedInUser = { ...userMock, login: 'testuser' };

const RoutedUserPageLayout = () => (
  <Routes>
    <Route path=':owner/*' element={<UserPageLayout />} />
  </Routes>
);

const renderUserPageLayout = (initialEntries = ['/testuser/profile'], queryOverrides = {}) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.CurrentUser], loggedInUser);
  return renderWithProviders(<RoutedUserPageLayout />, {
    initialEntries,
    queryClient,
    ...queryOverrides,
  });
};

describe('UserPageLayout', () => {
  it('renders PageLayout when owner matches the logged-in user', () => {
    renderUserPageLayout(['/testuser/profile']);
    expect(screen.getByText('PageLayout')).toBeInTheDocument();
  });

  it('renders the not-found page when owner does not match the logged-in user', () => {
    renderUserPageLayout(['/ttd/profile']);
    expect(
      screen.getByRole('heading', { name: textMock('not_found_page.heading') }),
    ).toBeInTheDocument();
  });

  it('renders PageLayout while user data is still loading', () => {
    const queryClient = createQueryClientMock();
    renderWithProviders(<RoutedUserPageLayout />, {
      initialEntries: ['/ttd/profile'],
      queryClient,
      queries: { getUser: () => new Promise<never>(() => {}) },
    });
    expect(screen.getByText('PageLayout')).toBeInTheDocument();
  });
});
