import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { AppStatus } from './AppStatus';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../../../test/testUtils';
import { queriesMock } from 'app-development/test/mocks';
import { textMock } from '../../../../testing/mocks/i18nMock';

// Test data
const org = 'ttd';
const app = 'test-ttd';
const envNameTest = 'tt02';
const envTypeTest = 'test';

const render = (queries = {}, envName = envNameTest, envType = envTypeTest) => {
  return renderWithProviders(<AppStatus envName={envName} envType={envType} />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
    queries: {
      ...queriesMock,
      ...queries,
    },
  });
};

describe('AppStatus', () => {
  it('shows loading spinner when loading required data', () => {
    render();

    expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
  });

  it('shows error message if an error occured while fetching required data', async () => {
    render({
      getDeployments: jest.fn().mockImplementation(() => Promise.reject()),
    });

    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));

    expect(screen.getByText(textMock('administration.app_status_error'))).toBeInTheDocument();
  });

  it('shows production when environment is production', async () => {
    const envNameProduction = 'production';
    const envTypeProduction = 'production';
    render(
      {
        getDeployments: jest.fn().mockImplementation(() =>
          Promise.resolve({
            results: [
              {
                tagName: '1',
                envName: envNameProduction,
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
      },
      envNameProduction,
      envTypeProduction,
    );

    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));

    expect(
      screen.getByRole('heading', { name: textMock('general.production') }),
    ).toBeInTheDocument();
  });

  it('shows success alert when application deployed', async () => {
    render({
      getDeployments: jest.fn().mockImplementation(() =>
        Promise.resolve({
          results: [
            {
              tagName: '1',
              envName: envNameTest,
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
    });

    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));

    expect(screen.getByRole('heading', { name: envNameTest.toUpperCase() })).toBeInTheDocument();
    expect(screen.getByText(textMock('administration.success'))).toBeInTheDocument();
    expect(screen.getByText(textMock('administration.last_published'))).toBeInTheDocument();
  });

  it('shows no app alert when application not deployed', async () => {
    render({
      getDeployments: jest.fn().mockImplementation(() =>
        Promise.resolve({
          results: [],
        }),
      ),
    });

    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));

    expect(screen.getByRole('heading', { name: envNameTest.toUpperCase() })).toBeInTheDocument();
    expect(screen.getByText(textMock('administration.no_app'))).toBeInTheDocument();
    expect(screen.getByText(textMock('administration.go_to_publish'))).toBeInTheDocument();
  });

  it('shows unavailable alert when application not reachable', async () => {
    render({
      getDeployments: jest.fn().mockImplementation(() =>
        Promise.resolve({
          results: [
            {
              tagName: '1',
              envName: envNameTest,
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
    });

    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));

    expect(screen.getByRole('heading', { name: envNameTest.toUpperCase() })).toBeInTheDocument();
    expect(screen.getByText(textMock('administration.unavailable'))).toBeInTheDocument();
    expect(screen.getByText(textMock('administration.go_to_build_log'))).toBeInTheDocument();
  });
});
