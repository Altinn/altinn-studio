import React from 'react';
import { App } from './App';
import type { IUserState } from './sharedResources/user/userSlice';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from './test/testUtils';
import * as testids from '../testing/testids';
import { textMock } from '../testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { RepoStatus } from 'app-shared/types/RepoStatus';

jest.mock('../language/src/nb.json', jest.fn());
jest.mock('../language/src/en.json', jest.fn());

const mockRepoStatus: RepoStatus = {
  aheadBy: 0,
  behindBy: 0,
  contentStatus: [],
  hasMergeConflict: false,
  repositoryStatus: 'Ok',
};

const getRepoStatus = jest.fn().mockImplementation(() => Promise.resolve({}));

const resolveAndWaitForSpinnerToDisappear = async (
  queries: Partial<ServicesContextProps> = {},
  remainingMinutes: number = 40,
) => {
  getRepoStatus.mockImplementation(() => Promise.resolve(mockRepoStatus));

  render(queries, remainingMinutes);
  await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));
};

const render = async (
  queries: Partial<ServicesContextProps> = {},
  remainingMinutes: number = 40,
) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    getRepoStatus,
    ...queries,
  };

  renderWithProviders(<App />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app`,
    queries: allQueries,
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
  afterEach(() => jest.clearAllMocks());

  it('initially displays the spinner when loading data', () => {
    render();

    expect(screen.getByTitle(textMock('general.loading'))).toBeInTheDocument();
  });

  it('shows a general page error if another error than 404 occured on the "getRepoStatus" query', async () => {
    const errorMessage = 'error-message-test';
    render({
      getRepoStatus: () => Promise.reject({ message: errorMessage }),
    });
    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));

    expect(screen.getByText(textMock('general.fetch_error_message'))).toBeInTheDocument();
    expect(screen.getByText(textMock('general.error_message_with_colon'))).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders 404 page when error is 404', async () => {
    render({
      getRepoStatus: () => Promise.reject({ message: '', response: { status: 404 } }),
    });
    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));

    expect(
      screen.getByRole('heading', { name: textMock('not_found_page.heading'), level: 1 }),
    ).toBeInTheDocument();
  });

  it('should present popover with options to log out or stay logged in when session about to expire ', async () => {
    await resolveAndWaitForSpinnerToDisappear({}, 6);

    await screen.findByTestId(testids.appContentWrapper);
    expect(screen.getByRole('button', { name: textMock('general.continue') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: textMock('general.sign_out') })).toBeInTheDocument();
  });

  it('should not present popover if session is over 10min', async () => {
    await resolveAndWaitForSpinnerToDisappear({}, 40);

    await screen.findByTestId(testids.appContentWrapper);
    expect(
      screen.queryByRole('button', { name: textMock('general.continue') }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: textMock('general.sign_out') }),
    ).not.toBeInTheDocument();
  });
});
