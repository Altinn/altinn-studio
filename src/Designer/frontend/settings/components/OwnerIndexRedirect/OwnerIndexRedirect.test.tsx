import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { OwnerIndexRedirect } from './OwnerIndexRedirect';
import { renderWithProviders } from '../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { user as userMock } from 'app-shared/mocks/mocks';
import { RoutePaths as UserRoutePaths } from '../../features/user/routes/RoutePaths';
import { RoutePaths as OrgRoutePaths } from '../../features/orgs/routes/RoutePaths';

const userWithLogin = { ...userMock, login: 'testuser' };

const RoutedOwnerIndexRedirect = () => (
  <Routes>
    <Route path='/:owner' element={<OwnerIndexRedirect />} />
    <Route path={`/:owner/${UserRoutePaths.ApiKeys}`} element={<div>User page</div>} />
    <Route path={`/:owner/${OrgRoutePaths.BotAccounts}`} element={<div>Org page</div>} />
  </Routes>
);

const renderOwnerIndexRedirect = (initialPath: string, seedUser = true) => {
  const queryClient = createQueryClientMock();
  if (seedUser) {
    queryClient.setQueryData([QueryKey.CurrentUser], userWithLogin);
  }
  return renderWithProviders(<RoutedOwnerIndexRedirect />, {
    queryClient,
    initialEntries: [initialPath],
  });
};

describe('OwnerIndexRedirect', () => {
  it('redirects to the api-keys page when owner matches the logged-in user', () => {
    renderOwnerIndexRedirect('/testuser');
    expect(screen.getByText('User page')).toBeInTheDocument();
  });

  it('redirects to the bot-accounts page when owner is an org', () => {
    renderOwnerIndexRedirect('/ttd');
    expect(screen.getByText('Org page')).toBeInTheDocument();
  });

  it('renders nothing when user data is not yet available', () => {
    renderOwnerIndexRedirect('/ttd', false);
    expect(screen.queryByText('User page')).not.toBeInTheDocument();
    expect(screen.queryByText('Org page')).not.toBeInTheDocument();
  });
});
