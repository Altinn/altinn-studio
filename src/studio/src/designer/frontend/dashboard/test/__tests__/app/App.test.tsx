import 'jest';
import * as React from 'react';
import { screen, act, waitForElementToBeRemoved } from '@testing-library/react';

import { SelectedContextType } from 'app-shared/navigation/main-header/Header';

import { renderWithProviders, setupServer, handlers } from 'test/testUtils';
import { App } from 'app/App';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const render = (extraDashboardState: any = {}) => {
  renderWithProviders(<App />, {
    preloadedState: {
      language: {
        language: {},
      },
      dashboard: {
        services: [],
        selectedContext: SelectedContextType.Self,
        ...extraDashboardState,
      },
    },
  });
};

describe('Dashboard > App', () => {
  it('should show waiting while user and orgs are not loaded', () => {
    render();

    expect(screen.getByText('dashboard.loading')).toBeInTheDocument();
    expect(screen.queryByText('dashboard.logout')).not.toBeInTheDocument();
  });

  it('should show logout button when user request takes too long', async () => {
    jest.useFakeTimers();
    render();
    act(() => {
      jest.advanceTimersByTime(6000);
    });

    const logoutBtn = await screen.findByText('dashboard.logout');

    expect(logoutBtn).toBeInTheDocument();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should show header when loaded', async () => {
    render({
      user: {
        id: 1,
        avatar_url: 'avatar_url',
        email: 'email',
        full_name: 'user_full_name',
        login: 'user_login',
      },
    });

    await waitForElementToBeRemoved(() =>
      screen.getByText('dashboard.loading'),
    );

    expect(
      screen.getByRole('link', { name: /dashboard.new_service/i }),
    ).toBeInTheDocument();
  });
});
