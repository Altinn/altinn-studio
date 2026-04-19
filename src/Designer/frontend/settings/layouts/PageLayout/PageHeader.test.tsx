import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PageHeader } from './PageHeader';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { useMediaQuery } from '@studio/hooks';
import { FeatureFlagsProvider } from '@studio/feature-flags';
import { DISPLAY_NAME } from 'app-shared/constants';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { user as userMock } from 'app-shared/mocks/mocks';

jest.mock('@studio/hooks', () => ({
  ...jest.requireActual('@studio/hooks'),
  useMediaQuery: jest.fn(),
}));
jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: () => ({ environment: {} }),
}));
jest.mock('app-shared/hooks/mutations/useLogoutMutation', () => ({
  useLogoutMutation: () => ({ mutate: jest.fn() }),
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

const userWithName = { ...userMock, login: 'test', full_name: 'Test User' };

const renderPageHeader = (initialEntries = ['/test'], isMobile = false) => {
  (useMediaQuery as jest.Mock).mockReturnValue(isMobile);
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.CurrentUser], userWithName);
  queryClient.setQueryData([QueryKey.Organizations], []);
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <FeatureFlagsProvider>
        <ServicesContextProvider {...queriesMock} client={queryClient}>
          <PageHeader />
        </ServicesContextProvider>
      </FeatureFlagsProvider>
    </MemoryRouter>,
  );
};

describe('PageHeader', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the app title in desktop mode', () => {
    renderPageHeader(['/test'], false);
    expect(screen.getByText(DISPLAY_NAME)).toBeInTheDocument();
  });

  it('renders navigation links in desktop mode', () => {
    renderPageHeader(['/test'], false);
    expect(
      screen.getByRole('link', { name: textMock('dashboard.header_item_dashboard') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: textMock('dashboard.header_item_library') }),
    ).toBeInTheDocument();
  });

  it('does not render navigation links in mobile mode', () => {
    renderPageHeader(['/test'], true);
    expect(
      screen.queryByRole('link', { name: textMock('dashboard.header_item_dashboard') }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: textMock('dashboard.header_item_library') }),
    ).not.toBeInTheDocument();
  });

  it('renders the profile menu trigger', () => {
    renderPageHeader(['/test'], false);
    expect(screen.getByRole('button', { name: userWithName.full_name })).toBeInTheDocument();
  });
});
