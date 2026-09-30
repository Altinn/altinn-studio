import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { UserPageLayout } from './UserPageLayout';
import { renderWithProviders } from '../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { user as userMock } from 'app-shared/mocks/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { User } from 'app-shared/types/Repository';

jest.mock('../../features/user/layout/PageLayout', () => ({
  PageLayout: () => <div>PageLayout</div>,
}));

const loggedInUser = { ...userMock, login: 'testuser' };

const RoutedUserPageLayout = () => (
  <Routes>
    <Route path=':owner/*' element={<UserPageLayout />} />
  </Routes>
);

type RenderOptions = {
  initialEntries?: string[];
  queries?: Record<string, unknown>;
  seedCurrentUser?: boolean;
  currentUser?: User | null;
};

const renderUserPageLayout = ({
  initialEntries = ['/testuser/profile'],
  queries = {},
  seedCurrentUser = true,
  currentUser = loggedInUser,
}: RenderOptions = {}) => {
  const queryClient = createQueryClientMock();
  if (seedCurrentUser) {
    queryClient.setQueryData([QueryKey.CurrentUser], currentUser);
  }
  return renderWithProviders(<RoutedUserPageLayout />, { initialEntries, queryClient, queries });
};

describe('UserPageLayout', () => {
  it('renders PageLayout when owner matches the logged-in user', () => {
    renderUserPageLayout({ initialEntries: ['/testuser/profile'] });
    expect(screen.getByText('PageLayout')).toBeInTheDocument();
  });

  it('renders PageLayout when owner matches the logged-in user with different casing', () => {
    renderUserPageLayout({ initialEntries: ['/TestUser/profile'] });
    expect(screen.getByText('PageLayout')).toBeInTheDocument();
  });

  it('renders the not-found page when owner does not match the logged-in user', () => {
    renderUserPageLayout({ initialEntries: ['/ttd/profile'] });
    expect(
      screen.getByRole('heading', { name: textMock('not_found_page.heading') }),
    ).toBeInTheDocument();
  });

  it('renders the not-found page when user data resolves without a user', () => {
    renderUserPageLayout({ currentUser: null });
    expect(
      screen.getByRole('heading', { name: textMock('not_found_page.heading') }),
    ).toBeInTheDocument();
  });

  it('renders the loading spinner while user data is still loading', () => {
    renderUserPageLayout({
      initialEntries: ['/testuser/profile'],
      queries: { getUser: () => new Promise<never>(() => {}) },
      seedCurrentUser: false,
    });
    expect(screen.getByRole('img', { name: textMock('general.loading') })).toBeInTheDocument();
  });

  it('renders the error page when the user query fails', async () => {
    renderUserPageLayout({
      initialEntries: ['/testuser/profile'],
      queries: { getUser: () => Promise.reject(new Error('failed')) },
      seedCurrentUser: false,
    });
    await screen.findByRole('heading', { name: textMock('general.page_error_title') });
  });
});
