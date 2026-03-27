import { screen } from '@testing-library/react';
import { PageLayout } from './PageLayout';
import { renderWithProviders } from '../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { user as userMock } from 'app-shared/mocks/mocks';

jest.mock('../components/Menu/Menu', () => ({ Menu: () => <div>Menu</div> }));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Outlet: () => <div>Outlet</div>,
}));
jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: () => ({ environment: {} }),
}));

const renderPageLayout = (initialEntries = ['/user/profile']) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.CurrentUser], userMock);
  return renderWithProviders(<PageLayout />, { queryClient, initialEntries });
};

describe('PageLayout', () => {
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
    const queryClient = createQueryClientMock();
    renderWithProviders(<PageLayout />, { queryClient, initialEntries: ['/user/profile'] });
    expect(screen.getByRole('img', { name: textMock('repo_status.loading') })).toBeInTheDocument();
  });

  it('does not render the settings heading when user data is missing', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CurrentUser], undefined);
    renderWithProviders(<PageLayout />, { queryClient, initialEntries: ['/user/profile'] });
    expect(
      screen.queryByRole('heading', { name: textMock('settings.user.heading') }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(textMock('settings.user.heading.description')),
    ).not.toBeInTheDocument();
  });
});
