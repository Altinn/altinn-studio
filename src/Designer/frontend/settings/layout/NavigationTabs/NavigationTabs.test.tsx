import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NavigationTabs } from './NavigationTabs';
import { renderWithProviders } from '../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { QueryClient } from '@tanstack/react-query';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const organizationsMock = [
  {
    username: 'ttd',
    full_name: 'The TTD org',
    avatar_url: '',
    id: 1,
  },
  {
    username: 'skd',
    full_name: '',
    avatar_url: '',
    id: 2,
  },
];

describe('NavigationTabs', () => {
  let queryClient: QueryClient;

  const renderNavigationTabs = (initialEntries = ['/user/api-keys']) =>
    renderWithProviders(<NavigationTabs />, { initialEntries, queryClient });

  beforeEach(() => {
    queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.Organizations], organizationsMock);
  });

  afterEach(() => jest.clearAllMocks());

  it('does not render tabs when organizations list is empty', () => {
    queryClient.setQueryData([QueryKey.Organizations], []);

    renderNavigationTabs();

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('renders user tab and organization tabs', () => {
    renderNavigationTabs();

    expect(
      screen.getByRole('tab', { name: textMock('settings.navigation.user') }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: organizationsMock[0].full_name })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: organizationsMock[1].username })).toBeInTheDocument();
  });

  it('marks the organization tab as selected from the pathname', () => {
    renderNavigationTabs(['/orgs/ttd/contact-points']);

    expect(screen.getByRole('tab', { name: organizationsMock[0].full_name })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('navigates when clicking an organization tab', async () => {
    const user = userEvent.setup();
    renderNavigationTabs();

    await user.click(screen.getByRole('tab', { name: organizationsMock[0].full_name }));

    expect(mockNavigate).toHaveBeenCalledWith('/orgs/ttd');
  });
});
