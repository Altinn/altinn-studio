import React from 'react';
import { App } from './App';
import { renderWithProviders } from 'test/testUtils';
import type { IUserState } from './sharedResources/user/userSlice';
import { screen } from '@testing-library/react';

afterAll(() => {
  jest.clearAllMocks();
});

describe('App', () => {
  it('should present popover with options to log out or stay logged in when session about to expire ', () => {
    renderWithProviders(<App />, {
      preloadedState: {
        userState: {
          session: {
            remainingMinutes: 6,
          },
        } as IUserState,
      },
    });

    expect(screen.getByTestId('logout-warning')).toBeInTheDocument();
  });

  it('should not present popover if session is over 10min', () => {
    renderWithProviders(<App />, {
      preloadedState: {
        userState: {
          session: {
            remainingMinutes: 40,
          },
        } as IUserState,
      },
    });
    expect(screen.queryByTestId('logout-warning')).not.toBeInTheDocument();
  });
});
