import React from 'react';
import { App } from './App';
import type { IUserState } from '../sharedResources/user/userSlice';
import { screen } from '@testing-library/react';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../test/testUtils';
import { appContentWrapperId } from '@studio/testing/testids';
import { textMock } from '@studio/testing/mocks/i18nMock';

jest.mock('../../language/src/nb.json', jest.fn());
jest.mock('../../language/src/en.json', jest.fn());

const render = async (remainingMinutes: number = 40) => {
  renderWithProviders(<App />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app`,
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
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should present popover with options to log out or stay logged in when session about to expire ', async () => {
    render(6);

    await screen.findByTestId(appContentWrapperId);
    expect(screen.getByRole('button', { name: textMock('general.continue') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: textMock('general.') })).toBeInTheDocument();
  });

  it('should not present popover if session is over 10min', async () => {
    render(40);

    await screen.findByTestId(appContentWrapperId);
    expect(
      screen.queryByRole('button', { name: textMock('general.continue') }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: textMock('general.sign_out') }),
    ).not.toBeInTheDocument();
  });
});
