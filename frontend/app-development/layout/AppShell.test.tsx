import React from 'react';
import { AppShell } from './AppShell';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../test/testUtils';
import { textMock } from '../../testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { RepoStatus } from 'app-shared/types/RepoStatus';
import { User } from 'app-shared/types/User';
import { RoutePaths } from 'app-development/enums/RoutePaths';

const mockOrg: string = 'org';
const mockApp: string = 'app';

const getRepoStatus = jest.fn().mockImplementation(() => Promise.resolve({}));
const getUser = jest.fn().mockImplementation(() => Promise.resolve({}));

const mockRepoStatus: RepoStatus = {
  aheadBy: 0,
  behindBy: 0,
  contentStatus: [],
  hasMergeConflict: false,
  repositoryStatus: 'Ok',
};

const mockUser: User = {
  avatar_url: 'test',
  email: 'test@test.com',
  full_name: 'Mock Tester',
  id: 1,
  login: 'MT1',
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    org: mockOrg,
    app: mockApp,
  }),
}));

// Mocking console.error due to Tanstack Query removing custom logger between V4 and v5 see issue: #11692
const realConsole = console;

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

  it('initially displays the spinner when loading data', () => {
    render();

    expect(screen.getByTitle(textMock('general.loading'))).toBeInTheDocument();
  });

  it('renders "NotFoundPage" when repoStatus has error', async () => {
    render({
      getRepoStatus: () => Promise.reject({ message: 'Not found', response: { status: 404 } }),
    });
    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));

    expect(
      screen.getByRole('heading', { name: textMock('not_found_page.heading'), level: 1 }),
    ).toBeInTheDocument();
  });

  it('renders "MergeConflictWarning" when repoStatus has merge conflict', async () => {
    render({
      getRepoStatus: () => Promise.resolve({ ...mockRepoStatus, hasMergeConflict: true }),
    });
    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));

    expect(
      screen.getByRole('heading', { name: textMock('merge_conflict.headline'), level: 1 }),
    ).toBeInTheDocument();
  });

  it('renderes the page content and no errors when there are no errors', async () => {
    await resolveAndWaitForSpinnerToDisappear();

    expect(
      screen.queryByRole('heading', { name: textMock('not_found_page.heading'), level: 1 }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole('heading', { name: textMock('merge_conflict.headline'), level: 1 }),
    ).not.toBeInTheDocument();
  });
});

const resolveAndWaitForSpinnerToDisappear = async (queries: Partial<ServicesContextProps> = {}) => {
  getRepoStatus.mockImplementation(() => Promise.resolve(mockRepoStatus));
  getUser.mockImplementation(() => Promise.resolve(mockUser));

  render(queries);
  await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));
};

const render = async (queries: Partial<ServicesContextProps> = {}) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    getRepoStatus,
    getUser,
    ...queries,
  };

  renderWithProviders(<AppShell />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app/${RoutePaths.Overview}`,
    queries: allQueries,
  });
};
