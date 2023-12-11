import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { AppLogs } from './AppLogs';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../../../test/testUtils';
import { queriesMock } from 'app-development/test/mocks';
import { textMock } from '../../../../testing/mocks/i18nMock';

// Test data
const org = 'ttd';
const app = 'test-ttd';

const render = (queries = {}) => {
  return renderWithProviders(<AppLogs />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
    queries: {
      ...queriesMock,
      ...queries,
    },
  });
};

describe('AppLogs', () => {
  it('shows loading spinner when loading required data', () => {
    render({
      getEnvironments: jest.fn().mockImplementation(() => Promise.resolve([])),
    });

    expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
  });

  it('shows error message if an error occured while fetching required data', async () => {
    render({
      getEnvironments: jest.fn().mockImplementation(() => Promise.reject()),
    });

    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));

    expect(screen.getByText(textMock('overview.app_logs_error'))).toBeInTheDocument();
  });

  it('shows list of deployments', async () => {
    render({
      getDeployments: jest.fn().mockImplementation(() =>
        Promise.resolve({
          results: [
            {
              tagName: '2',
              envName: 'production',
              deployedInEnv: true,
              build: {
                id: '14381045',
                status: 'completed',
                result: 'succeeded',
                started: '2023-10-03T09:57:31.238Z',
                finished: '2023-10-03T09:57:41.29Z',
              },
              created: '2023-10-03T11:57:31.072013+02:00',
              createdBy: 'test',
              app,
              org,
            },
            {
              tagName: '1',
              envName: 'tt02',
              deployedInEnv: true,
              build: {
                id: '14381045',
                status: 'completed',
                result: 'succeeded',
                started: '2023-10-03T09:57:31.238Z',
                finished: '2023-10-03T09:57:41.29Z',
              },
              created: '2023-10-03T11:57:31.072013+02:00',
              createdBy: 'test',
              app,
              org,
            },
          ],
        }),
      ),
      getEnvironments: jest.fn().mockImplementation(() =>
        Promise.resolve([
          {
            appsUrl: 'http://host.docker.internal:6161',
            platformUrl: 'http://host.docker.internal:6161',
            hostname: 'host.docker.internal:6161',
            appPrefix: 'apps',
            platformPrefix: 'platform',
            name: 'production',
            type: 'production',
          },
          {
            appsUrl: 'http://host.docker.internal:6161',
            platformUrl: 'http://host.docker.internal:6161',
            hostname: 'host.docker.internal:6161',
            appPrefix: 'apps',
            platformPrefix: 'platform',
            name: 'tt02',
            type: 'test',
          },
          {
            appsUrl: 'http://host.docker.internal:6161',
            platformUrl: 'http://host.docker.internal:6161',
            hostname: 'host.docker.internal:6161',
            appPrefix: 'apps',
            platformPrefix: 'platform',
            name: 'at21',
            type: 'test',
          },
          {
            appsUrl: 'http://host.docker.internal:6161',
            platformUrl: 'http://host.docker.internal:6161',
            hostname: 'host.docker.internal:6161',
            appPrefix: 'apps',
            platformPrefix: 'platform',
            name: 'at22',
            type: 'test',
          },
        ]),
      ),
    });

    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));

    expect(
      screen.getByRole('heading', { name: textMock('overview.activity') }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        textMock('overview.app_logs_title', {
          tagName: '2',
          environment: textMock('general.production_environment'),
          envName: 'PRODUCTION',
        }),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(textMock('overview.app_logs_title', { tagName: '1', envName: 'TT02' })),
    ).toBeInTheDocument();
  });

  it('shows no activity message when deployments are empty', async () => {
    render({
      getDeployments: jest.fn().mockImplementation(() =>
        Promise.resolve({
          results: [
            {
              tagName: '2',
              envName: 'production',
              deployedInEnv: true,
              build: {
                id: '14381045',
                status: 'completed',
                result: '',
                started: '2023-10-03T09:57:31.238Z',
                finished: '2023-10-03T09:57:41.29Z',
              },
              created: '2023-10-03T11:57:31.072013+02:00',
              createdBy: 'test',
              app,
              org,
            },
            {
              tagName: '1',
              envName: 'tt02',
              deployedInEnv: true,
              build: {
                id: '14381045',
                status: 'completed',
                result: 'succeeded',
                started: '2023-10-03T09:57:31.238Z',
                finished: null,
              },
              created: '2023-10-03T11:57:31.072013+02:00',
              createdBy: 'test',
              app,
              org,
            },
          ],
        }),
      ),
      getEnvironments: jest.fn().mockImplementation(() =>
        Promise.resolve([
          {
            appsUrl: 'http://host.docker.internal:6161',
            platformUrl: 'http://host.docker.internal:6161',
            hostname: 'host.docker.internal:6161',
            appPrefix: 'apps',
            platformPrefix: 'platform',
            name: 'production',
            type: 'production',
          },
          {
            appsUrl: 'http://host.docker.internal:6161',
            platformUrl: 'http://host.docker.internal:6161',
            hostname: 'host.docker.internal:6161',
            appPrefix: 'apps',
            platformPrefix: 'platform',
            name: 'tt02',
            type: 'test',
          },
        ]),
      ),
    });

    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));

    expect(
      screen.getByRole('heading', { name: textMock('overview.activity') }),
    ).toBeInTheDocument();
    expect(screen.getByText(textMock('overview.no_activity'))).toBeInTheDocument();
  });
});
