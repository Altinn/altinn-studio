import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { PageLayout } from './PageLayout';
import { renderWithProviders } from '../../testing/mocks';
import { appContentWrapperId } from '@studio/testing/testids';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

const mockNavigate = jest.fn();

jest.mock('./WebSocketSyncWrapper', () => ({
  WebSocketSyncWrapper: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Outlet: () => <div>Outlet</div>,
  useNavigate: () => mockNavigate,
}));
jest.mock('app-shared/components/PageHeader/PageHeader', () => ({
  PageHeader: ({ onOrgSelect, onUserSelect }: any) => (
    <>
      <button
        onClick={() =>
          onOrgSelect({ username: 'skd', full_name: 'Skatteetaten', avatar_url: '', id: 2 })
        }
      >
        Skatteetaten
      </button>
      <button
        onClick={() =>
          onUserSelect({
            login: 'test',
            full_name: 'Test User',
            id: 1,
            email: '',
            avatar_url: '',
            userType: 0,
          })
        }
      >
        Test User
      </button>
    </>
  ),
}));

const scrollToMock = jest.fn();
Object.defineProperty(window, 'scrollTo', { value: scrollToMock, writable: true });

const userMock = {
  avatar_url: '',
  email: '',
  full_name: 'Test User',
  id: 1,
  login: 'testuser',
  userType: 0,
};

const renderPageLayout = (initialEntries = ['/ttd/apps']) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.CurrentUser], userMock);
  return renderWithProviders(
    <Routes>
      <Route path='/:owner/*' element={<PageLayout />} />
    </Routes>,
    { queryClient, initialEntries },
  );
};

describe('PageLayout', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the app content wrapper', () => {
    renderPageLayout();
    expect(screen.getByTestId(appContentWrapperId)).toBeInTheDocument();
  });

  it('renders the Outlet', () => {
    renderPageLayout();
    expect(screen.getByText('Outlet')).toBeInTheDocument();
  });

  it('scrolls to top on mount', () => {
    renderPageLayout();
    expect(scrollToMock).toHaveBeenCalledWith(0, 0);
  });

  it('navigates to org page preserving sub-path when clicking org menu item', async () => {
    const user = userEvent.setup();
    renderPageLayout(['/ttd/apps/at22/my-app']);

    await user.click(screen.getByRole('button', { name: 'Skatteetaten' }));

    expect(mockNavigate).toHaveBeenCalledWith('/skd/apps/at22/my-app');
  });

  it('navigates to user page preserving sub-path when clicking user menu item', async () => {
    const user = userEvent.setup();
    renderPageLayout(['/ttd/apps']);

    await user.click(screen.getByRole('button', { name: 'Test User' }));

    expect(mockNavigate).toHaveBeenCalledWith('/test/apps');
  });

  it('renders a loading spinner while the user query is pending', () => {
    const queryClient = createQueryClientMock();
    renderWithProviders(
      <Routes>
        <Route path='/:owner/*' element={<PageLayout />} />
      </Routes>,
      { queryClient, initialEntries: ['/ttd/apps'] },
    );
    expect(screen.getByRole('img', { name: textMock('general.loading') })).toBeInTheDocument();
  });

  it('renders the error page when the user query fails', async () => {
    renderWithProviders(
      <Routes>
        <Route path='/:owner/*' element={<PageLayout />} />
      </Routes>,
      {
        queries: { getUser: () => Promise.reject(new Error('failed')) },
        initialEntries: ['/ttd/apps'],
      },
    );
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: textMock('general.page_error_title') }),
      ).toBeInTheDocument();
    });
  });

  it('navigates to org page when no sub-path exists', async () => {
    const user = userEvent.setup();
    renderPageLayout(['/ttd']);

    await user.click(screen.getByRole('button', { name: 'Skatteetaten' }));

    expect(mockNavigate).toHaveBeenCalledWith('/skd');
  });

  it('navigates to user page when no sub-path exists', async () => {
    const user = userEvent.setup();
    renderPageLayout(['/ttd']);

    await user.click(screen.getByRole('button', { name: 'Test User' }));

    expect(mockNavigate).toHaveBeenCalledWith('/test');
  });
});
