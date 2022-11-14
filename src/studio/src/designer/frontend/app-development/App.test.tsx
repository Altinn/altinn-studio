import React from 'react';
import { App } from './App';
import type { IUserState } from './sharedResources/user/userSlice';
import { screen } from '@testing-library/react';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from './test/testUtils';

describe('App', () => {
  afterEach(() => jest.clearAllMocks());

  it('should present popover with options to log out or stay logged in when session about to expire ', () => {
    renderWithProviders(<App />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app`,
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
      startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app/`,
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
