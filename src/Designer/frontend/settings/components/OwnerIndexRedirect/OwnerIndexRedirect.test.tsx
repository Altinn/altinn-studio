import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { OwnerIndexRedirect } from './OwnerIndexRedirect';
import { renderWithProviders } from '../../testing/mocks';
import { user as userMock } from 'app-shared/mocks/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { RoutePaths as UserRoutePaths } from '../../features/user/routes/RoutePaths';
import { RoutePaths as OrgRoutePaths } from '../../features/orgs/routes/RoutePaths';

const userWithLogin = { ...userMock, login: 'testuser' };

const mockUseUserQuery = jest.fn();
jest.mock('app-shared/hooks/queries', () => ({
  ...jest.requireActual('app-shared/hooks/queries'),
  useUserQuery: () => mockUseUserQuery(),
}));

const RoutedOwnerIndexRedirect = () => (
  <Routes>
    <Route path='/:owner' element={<OwnerIndexRedirect />} />
    <Route path={`/:owner/${UserRoutePaths.ApiKeys}`} element={<div>User page</div>} />
    <Route path={`/:owner/${OrgRoutePaths.BotAccounts}`} element={<div>Bot accounts page</div>} />
  </Routes>
);

const renderOwnerIndexRedirect = (initialPath: string) =>
  renderWithProviders(<RoutedOwnerIndexRedirect />, { initialEntries: [initialPath] });

describe('OwnerIndexRedirect', () => {
  beforeEach(() => {
    mockUseUserQuery.mockReturnValue({ isPending: false, isError: false, data: userWithLogin });
  });

  afterEach(() => jest.clearAllMocks());

  it('redirects to the api-keys page when owner matches the logged-in user', () => {
    renderOwnerIndexRedirect('/testuser');
    expect(screen.getByText('User page')).toBeInTheDocument();
  });

  it('redirects to the api-keys page when owner matches the logged-in user with different casing', () => {
    renderOwnerIndexRedirect('/TestUser');
    expect(screen.getByText('User page')).toBeInTheDocument();
  });

  it('redirects to the bot-accounts page when owner is an org', () => {
    renderOwnerIndexRedirect('/ttd');
    expect(screen.getByText('Bot accounts page')).toBeInTheDocument();
  });

  it('renders nothing when user data is not yet available', () => {
    mockUseUserQuery.mockReturnValue({ isPending: true, isError: false, data: undefined });
    renderOwnerIndexRedirect('/ttd');
    expect(screen.queryByText('User page')).not.toBeInTheDocument();
    expect(screen.queryByText('Bot accounts page')).not.toBeInTheDocument();
  });

  it('renders an error page when the user query fails', () => {
    mockUseUserQuery.mockReturnValue({ isPending: false, isError: true, data: undefined });
    renderOwnerIndexRedirect('/ttd');
    expect(screen.getByText(textMock('general.page_error_title'))).toBeInTheDocument();
  });
});
