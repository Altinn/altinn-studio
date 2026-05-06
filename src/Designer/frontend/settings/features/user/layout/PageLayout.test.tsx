import { screen } from '@testing-library/react';
import { PageLayout } from './PageLayout';
import { renderWithProviders } from '../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { user as userMock } from 'app-shared/mocks/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { QueryClient } from '@tanstack/react-query';

jest.mock('../components/Menu/Menu', () => ({ Menu: () => <div>Menu</div> }));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Outlet: () => <div>Outlet</div>,
}));
jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: () => ({ environment: {} }),
}));

describe('PageLayout', () => {
  let queryClient: QueryClient;

  const renderPageLayout = (initialEntries = ['/user/profile']) =>
    renderWithProviders(<PageLayout />, { initialEntries, queryClient });

  beforeEach(() => {
    queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CurrentUser], userMock);
  });

  it('renders the settings heading', () => {
    renderPageLayout();
    expect(screen.getByText(textMock('settings.user.heading'))).toBeInTheDocument();
    expect(screen.getByText(textMock('settings.user.heading.description'))).toBeInTheDocument();
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
    const localQueryClient = createQueryClientMock();
    renderWithProviders(<PageLayout />, {
      initialEntries: ['/user/profile'],
      queryClient: localQueryClient,
      queries: { getUser: () => new Promise<never>(() => {}) },
    });
    expect(screen.getByRole('img', { name: textMock('general.loading') })).toBeInTheDocument();
  });

  it('does not render the settings heading when user data is missing', () => {
    queryClient.setQueryData([QueryKey.CurrentUser], null);
    renderPageLayout();
    expect(
      screen.queryByRole('heading', { name: textMock('settings.user.heading') }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(textMock('settings.user.heading.description')),
    ).not.toBeInTheDocument();
  });

  it('renders the error page when user data is missing after loading', () => {
    queryClient.setQueryData([QueryKey.CurrentUser], null);
    renderPageLayout();
    expect(screen.queryByText('Menu')).not.toBeInTheDocument();
    expect(screen.queryByText('Outlet')).not.toBeInTheDocument();
  });
});
