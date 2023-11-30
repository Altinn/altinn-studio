import React from 'react';
import { App } from './App';
import type { IUserState } from './sharedResources/user/userSlice';
import { screen } from '@testing-library/react';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from './test/testUtils';
import * as testids from '../testing/testids';
import { textMock } from '../testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';

jest.mock('../language/src/nb.json', jest.fn());
jest.mock('../language/src/en.json', jest.fn());

// Mocking console.error due to Tanstack Query removing custom logger between V4 and v5 see issue: #11692
const realConsole = console;
const render = async (remainingMinutes: number = 40) => {
  renderWithProviders(<App />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app`,
    queries: { ...queriesMock },
    preloadedState: {
      userState: {
        session: {
          remainingMinutes: remainingMinutes,
        },
      } as IUserState,
    },
  });
};
describe('App', () => {
  beforeEach(() => {
    global.console = {
      ...console,
      error: jest.fn(),
    };
  });
  afterEach(() => {
    global.console = realConsole;
    jest.clearAllMocks();
  });

  it('should present popover with options to log out or stay logged in when session about to expire ', async () => {
    render(6);

    await screen.findByTestId(testids.appContentWrapper);
    expect(screen.getByRole('button', { name: textMock('general.continue') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: textMock('general.sign_out') })).toBeInTheDocument();
  });

  it('should not present popover if session is over 10min', async () => {
    render(40);

    await screen.findByTestId(testids.appContentWrapper);
    expect(
      screen.queryByRole('button', { name: textMock('general.continue') }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: textMock('general.sign_out') }),
    ).not.toBeInTheDocument();
  });
});
