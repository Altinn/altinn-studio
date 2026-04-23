import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { PageLayout } from './PageLayout';
import { renderWithProviders } from '../../testing/mocks';
import { appContentWrapperId } from '@studio/testing/testids';
import { QueryKey } from 'app-shared/types/QueryKey';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { useMediaQuery } from '@studio/hooks';
import { useFeatureFlag } from '@studio/feature-flags';

const mockNavigate = jest.fn();

jest.mock('./WebSocketSyncWrapper', () => ({
  WebSocketSyncWrapper: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Outlet: () => <div>Outlet</div>,
  useNavigate: () => mockNavigate,
}));
jest.mock('@studio/hooks', () => ({
  ...jest.requireActual('@studio/hooks'),
  useMediaQuery: jest.fn(),
}));
jest.mock('@studio/feature-flags', () => ({
  ...jest.requireActual('@studio/feature-flags'),
  useFeatureFlag: jest.fn(),
}));
jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: jest.fn(() => ({ environment: {} })),
}));
jest.mock('app-shared/hooks/mutations/useLogoutMutation', () => ({
  useLogoutMutation: () => ({ mutate: jest.fn() }),
}));

const scrollToMock = jest.fn();
Object.defineProperty(window, 'scrollTo', { value: scrollToMock, writable: true });

const userMock = {
  avatar_url: '',
  email: '',
  full_name: 'Test User',
  id: 1,
  login: 'test',
  userType: 0,
};

const organizationsMock = [
  { username: 'ttd', full_name: 'The TTD org', avatar_url: '', id: 1 },
  { username: 'skd', full_name: 'Skatteetaten', avatar_url: '', id: 2 },
];

const renderPageLayout = (initialEntries = ['/ttd/apps']) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.CurrentUser], userMock);
  queryClient.setQueryData([QueryKey.Organizations], organizationsMock);
  return renderWithProviders(
    <Routes>
      <Route path='/:owner/*' element={<PageLayout />} />
    </Routes>,
    { queryClient, initialEntries },
  );
};

describe('PageLayout', () => {
  beforeEach(() => {
    (useMediaQuery as jest.Mock).mockReturnValue(false);
    (useFeatureFlag as jest.Mock).mockReturnValue(false);
  });

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

    await user.click(screen.getByRole('button', { name: /The TTD org/ }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Skatteetaten' }));

    expect(mockNavigate).toHaveBeenCalledWith('/skd/apps/at22/my-app');
  });

  it('navigates to user page preserving sub-path when clicking user menu item', async () => {
    const user = userEvent.setup();
    renderPageLayout(['/ttd/apps']);

    await user.click(screen.getByRole('button', { name: /The TTD org/ }));
    await user.click(screen.getByRole('menuitemradio', { name: userMock.full_name }));

    expect(mockNavigate).toHaveBeenCalledWith('/test/apps');
  });
});
