import React from 'react';
import { App } from './App';
import type { IUserState } from './sharedResources/user/userSlice';
import { screen } from '@testing-library/react';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from './test/testUtils';
import * as testids from '../testing/testids';
import { textMock } from '../testing/mocks/i18nMock';

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
    await screen.findByTestId(testids.appContentWrapper);
    expect(screen.getByRole('button', { name: textMock('general.continue') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: textMock('general.sign_out') })).toBeInTheDocument();
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
    await screen.findByTestId(testids.appContentWrapper);
    expect(
      screen.queryByRole('button', { name: textMock('general.continue') })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: textMock('general.sign_out') })
    ).not.toBeInTheDocument();
  });
});
