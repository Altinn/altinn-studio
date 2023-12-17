import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { AppEnvironments } from './AppEnvironments';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../../../test/testUtils';
import { textMock } from '../../../../testing/mocks/i18nMock';

// Test data
const org = 'org';
const app = 'app';

const render = (queries = {}) => {
  return renderWithProviders(<AppEnvironments />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
    queries,
  });
};

describe('AppEnvironments', () => {
  it('shows loading spinner when loading required data', () => {
    render({
      getEnvironments: jest.fn().mockImplementation(() => Promise.resolve([])),
      getOrgList: jest.fn().mockImplementation(() => Promise.resolve([])),
    });

    expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
  });

  it('shows error message if an error occured while fetching required data', async () => {
    render({
      getEnvironments: jest.fn().mockImplementation(() => Promise.reject()),
      getOrgList: jest.fn().mockImplementation(() => Promise.reject()),
    });

    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));

    expect(screen.getByText(textMock('overview.app_environments_error'))).toBeInTheDocument();
  });

  it('shows no environments message when organization has no environment', async () => {
    render({
      getEnvironments: jest.fn().mockImplementation(() => Promise.resolve([])),
      getOrgList: jest.fn().mockImplementation(() => Promise.resolve({ orgs: [] })),
    });

    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));

    expect(
      screen.getByRole('heading', { name: textMock('app_publish.no_env_title') }),
    ).toBeInTheDocument();
    expect(screen.getByText(textMock('app_publish.no_env_1'))).toBeInTheDocument();
    expect(screen.getByText(textMock('app_publish.no_env_2'))).toBeInTheDocument();
  });

  it('shows statuses when organization has environments', async () => {
    const envName = 'tt02';
    const envType = 'test';
    render({
      getDeployments: jest.fn().mockImplementation(() =>
        Promise.resolve({
          results: [
            {
              tagName: '1',
              envName,
              deployedInEnv: false,
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
            name: envName,
            type: envType,
          },
        ]),
      ),
      getOrgList: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ orgs: { [org]: { environments: [envName] } } }),
        ),
    });

    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));

    expect(screen.getByRole('heading', { name: envName })).toBeInTheDocument();
    expect(screen.getByText(textMock('overview.unavailable'))).toBeInTheDocument();
    expect(screen.getByText(textMock('overview.go_to_build_log'))).toBeInTheDocument();
  });
});
