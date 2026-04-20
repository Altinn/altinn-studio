import { screen } from '@testing-library/react';
import { PageLayout } from './PageLayout';
import { renderWithProviders } from '../../testing/mocks';
import { appContentWrapperId } from '@studio/testing/testids';

jest.mock('./WebSocketSyncWrapper', () => ({
  WebSocketSyncWrapper: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('app-shared/components/PageHeader/PageHeader', () => ({
  PageHeader: () => <div>PageHeader</div>,
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Outlet: () => <div>Outlet</div>,
}));

const scrollToMock = jest.fn();
Object.defineProperty(window, 'scrollTo', { value: scrollToMock, writable: true });

describe('PageLayout', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the app content wrapper', () => {
    renderWithProviders(<PageLayout />, { initialEntries: ['/'] });
    expect(screen.getByTestId(appContentWrapperId)).toBeInTheDocument();
  });

  it('renders PageHeader', () => {
    renderWithProviders(<PageLayout />, { initialEntries: ['/'] });
    expect(screen.getByText('PageHeader')).toBeInTheDocument();
  });

  it('renders the Outlet', () => {
    renderWithProviders(<PageLayout />, { initialEntries: ['/'] });
    expect(screen.getByText('Outlet')).toBeInTheDocument();
  });

  it('scrolls to top on mount', () => {
    renderWithProviders(<PageLayout />, { initialEntries: ['/'] });
    expect(scrollToMock).toHaveBeenCalledWith(0, 0);
  });
});
