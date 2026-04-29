import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { IndexRedirect } from './IndexRedirect';
import { renderWithProviders } from '../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { user as userMock } from 'app-shared/mocks/mocks';

const userWithLogin = { ...userMock, login: 'testuser' };

const RoutedIndexRedirect = () => (
  <Routes>
    <Route path='/' element={<IndexRedirect />} />
    <Route path='/:owner' element={<div>Owner page</div>} />
  </Routes>
);

describe('IndexRedirect', () => {
  it('redirects to the user login path when user data is available', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CurrentUser], userWithLogin);
    renderWithProviders(<RoutedIndexRedirect />, { queryClient, initialEntries: ['/'] });
    expect(screen.getByText('Owner page')).toBeInTheDocument();
  });

  it('renders nothing when user data is not yet available', () => {
    renderWithProviders(<RoutedIndexRedirect />, { initialEntries: ['/'] });
    expect(screen.queryByText('Owner page')).not.toBeInTheDocument();
  });
});
