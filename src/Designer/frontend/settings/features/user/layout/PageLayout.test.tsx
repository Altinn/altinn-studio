import { screen } from '@testing-library/react';
import { PageLayout } from './PageLayout';
import { renderWithProviders } from '../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { user as userMock } from 'app-shared/mocks/mocks';
import { useUserQuery } from 'app-shared/hooks/queries';

jest.mock('../components/Menu/Menu', () => ({ Menu: () => <div>Menu</div> }));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Outlet: () => <div>Outlet</div>,
}));
jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: () => ({ environment: {} }),
}));
jest.mock('app-shared/hooks/queries', () => ({
  ...jest.requireActual('app-shared/hooks/queries'),
  useUserQuery: jest.fn(),
}));

const renderPageLayout = (initialEntries = ['/user/profile']) =>
  renderWithProviders(<PageLayout />, { initialEntries });

describe('PageLayout', () => {
  beforeEach(() => {
    jest.mocked(useUserQuery).mockReturnValue({
      data: userMock,
      isPending: false,
    } as ReturnType<typeof useUserQuery>);
  });

  afterEach(() => jest.clearAllMocks());

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
    jest.mocked(useUserQuery).mockReturnValueOnce({
      data: undefined,
      isPending: true,
    } as ReturnType<typeof useUserQuery>);
    renderPageLayout();
    expect(screen.getByRole('img', { name: textMock('repo_status.loading') })).toBeInTheDocument();
  });

  it('does not render the settings heading when user data is missing', () => {
    jest.mocked(useUserQuery).mockReturnValueOnce({
      data: undefined,
      isPending: false,
    } as ReturnType<typeof useUserQuery>);
    renderPageLayout();
    expect(
      screen.queryByRole('heading', { name: textMock('settings.user.heading') }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(textMock('settings.user.heading.description')),
    ).not.toBeInTheDocument();
  });

  it('renders the error page when user data is missing after loading', () => {
    jest.mocked(useUserQuery).mockReturnValueOnce({
      data: undefined,
      isPending: false,
    } as ReturnType<typeof useUserQuery>);
    renderPageLayout();
    expect(screen.queryByText('Menu')).not.toBeInTheDocument();
    expect(screen.queryByText('Outlet')).not.toBeInTheDocument();
  });
});
