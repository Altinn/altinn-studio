import React from 'react';
import { App } from './App';
import type { IUserState } from './sharedResources/user/userSlice';
import { screen } from '@testing-library/react';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from './test/testUtils';

jest.mock('../language/src/nb.json', jest.fn());
jest.mock('../language/src/en.json', jest.fn());
const queries = {
  getRepoStatus: async () => ({
    aheadBy: 0,
    behindBy: 0,
    contentStatus: [],
    hasMergeConflict: false,
    repositoryStatus: 'Ok',
  }),
};
describe('App', () => {
  afterEach(() => jest.clearAllMocks());

  it('should present popover with options to log out or stay logged in when session about to expire ', async () => {
    renderWithProviders(<App />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app`,
      queries,
      preloadedState: {
        userState: {
          session: {
            remainingMinutes: 6,
          },
        } as IUserState,
      },
    });
    await screen.findByTestId('app-content-wrapper');
    expect(screen.getByTestId('logout-warning')).toBeInTheDocument();
  });

  it('should not present popover if session is over 10min', async () => {
    renderWithProviders(<App />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app`,
      queries,
      preloadedState: {
        userState: {
          session: {
            remainingMinutes: 40,
          },
        } as IUserState,
      },
    });
    await screen.findByTestId('app-content-wrapper');
    expect(screen.queryByTestId('logout-warning')).not.toBeInTheDocument();
  });
});
