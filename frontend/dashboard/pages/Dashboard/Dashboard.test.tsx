import React from 'react';
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { handlers, renderWithProviders, setupServer } from '../../dashboardTestUtils';
import { SelectedContextType } from 'app-shared/navigation/main-header/Header';
import { Dashboard } from './Dashboard';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const render = (selectedContext: SelectedContextType | number = SelectedContextType.Self) => {
  const user = userEvent.setup();
  renderWithProviders(<Dashboard disableDebounce />, {
    preloadedState: {
      language: {
        language: {},
      },
      dashboard: {
        services: [],
        selectedContext,
        repoRowsPerPage: 5,
        user: {
          id: 2,
          avatar_url: 'avatar_url',
          email: 'email',
          full_name: 'user_full_name',
          login: 'user_login',
        },
      },
    },
  });
  return { user };
};

describe('Dashboard > index', () => {
  it('displays FavoriteReposList and OrgReposList when selected context is an organization', async () => {
    const organizationId = 1;
    render(organizationId);
    await waitFor(() => expect(screen.getByText('test-org dashboard.apps')).toBeInTheDocument());

    expect(screen.getByText('test-org dashboard.apps')).toBeInTheDocument();

    expect(screen.queryByTestId('favorite-repos-list')).toBeInTheDocument();

    expect(screen.queryByTestId('org-repos-list')).toBeInTheDocument();
    expect(screen.queryByTestId('search-result-repos-list')).not.toBeInTheDocument();
  });

  it('displays FavoriteReposList and OrgReposList, and not search results list by default', () => {
    render();

    expect(screen.queryByTestId('favorite-repos-list')).toBeInTheDocument();
    expect(screen.queryByTestId('org-repos-list')).toBeInTheDocument();
    expect(screen.queryByTestId('search-result-repos-list')).not.toBeInTheDocument();
  });

  it('should show search results list and hide FavoriteReposList and OrgReposList when user types into search input', async () => {
    const { user } = render();

    const searchInput = screen.getByTestId('search-repos-default');
    await user.type(searchInput, 'search');
    await waitFor(() => {
      expect(screen.queryByTestId('favorite-repos-list')).not.toBeInTheDocument();
      expect(screen.queryByTestId('org-repos-list')).not.toBeInTheDocument();
      expect(screen.queryByTestId('search-result-repos-list')).toBeInTheDocument();
    });
  });

  it('should hide search results list and show FavoriteReposList and OrgReposList again when user hits escape while the search input is focused', async () => {
    const { user } = render();

    const searchInput = screen.getByTestId('search-repos-default');
    await user.type(searchInput, 'search');

    await waitFor(() => {
      expect(screen.queryByTestId('favorite-repos-list')).not.toBeInTheDocument();
      expect(screen.queryByTestId('org-repos-list')).not.toBeInTheDocument();
      expect(screen.queryByTestId('search-result-repos-list')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitForElementToBeRemoved(screen.queryByTestId('search-result-repos-list'));

    expect(screen.queryByTestId('favorite-repos-list')).toBeInTheDocument();
    expect(screen.queryByTestId('org-repos-list')).toBeInTheDocument();
    expect(screen.queryByTestId('search-result-repos-list')).not.toBeInTheDocument();
  });

  it('should hide search results list and show FavoriteReposList and OrgReposList again when user hits clear button on input field', async () => {
    const { user } = render();

    const searchInput = screen.getByTestId('search-repos-default');
    await user.type(searchInput, 'search');

    await waitFor(() => {
      expect(screen.queryByTestId('favorite-repos-list')).not.toBeInTheDocument();
      expect(screen.queryByTestId('org-repos-list')).not.toBeInTheDocument();
      expect(screen.queryByTestId('search-result-repos-list')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('clear-search-button'));

    await waitForElementToBeRemoved(() => screen.queryByTestId('search-result-repos-list'));

    expect(screen.queryByTestId('favorite-repos-list')).toBeInTheDocument();
    expect(screen.queryByTestId('org-repos-list')).toBeInTheDocument();
    expect(screen.queryByTestId('search-result-repos-list')).not.toBeInTheDocument();
  });

  it('should navigate to create new app when clicking new app link', async () => {
    const { user } = render();

    expect(window.location.href.includes('new')).toBe(false);

    await user.click(screen.getByRole('link', { name: /dashboard.new_service/i }));

    expect(window.location.href.includes('new')).toBe(true);
  });
});
