import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { AppStatus } from './AppStatus';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../../../test/testUtils';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { appDeployment } from 'app-shared/mocks/mocks';

// Test data
const org = 'ttd';
const app = 'test-ttd';
const envNameTest = 'tt02';
const envTypeTest = 'test';

const render = (queries = {}, envName = envNameTest, envType = envTypeTest) => {
  return renderWithProviders(<AppStatus envName={envName} envType={envType} />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
    queries,
  });
};

describe('AppStatus', () => {
  it('shows loading spinner when loading required data', () => {
    render();

    expect(screen.getByText(textMock('overview.loading_deploys'))).toBeInTheDocument();
  });

  it('shows error message if an error occured while fetching required data', async () => {
    render({
      getDeployments: jest.fn().mockImplementation(() => Promise.reject()),
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('overview.loading_deploys')),
    );

    expect(screen.getByText(textMock('overview.app_status_error'))).toBeInTheDocument();
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
                ...appDeployment,
                deployedInEnv: true,
              },
            ],
          }),
        ),
      },
      envNameProduction,
      envTypeProduction,
    );

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('overview.loading_deploys')),
    );

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
              ...appDeployment,
              envName: envNameTest,
              deployedInEnv: true,
            },
          ],
        }),
      ),
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('overview.loading_deploys')),
    );

    expect(screen.getByRole('heading', { name: envNameTest })).toBeInTheDocument();
    expect(screen.getByText(textMock('overview.success'))).toBeInTheDocument();
    expect(screen.getByText(textMock('overview.last_published'))).toBeInTheDocument();
  });

  it('shows no app alert when application not deployed', async () => {
    render();

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('overview.loading_deploys')),
    );

    expect(screen.getByRole('heading', { name: envNameTest })).toBeInTheDocument();
    expect(screen.getByText(textMock('overview.no_app'))).toBeInTheDocument();
    expect(screen.getByText(textMock('overview.go_to_publish'))).toBeInTheDocument();
  });

  it('shows unavailable alert when application not reachable', async () => {
    render({
      getDeployments: jest.fn().mockImplementation(() =>
        Promise.resolve({
          results: [
            {
              ...appDeployment,
              envName: envNameTest,
              build: {
                ...appDeployment.build,
                finished: '2023-10-03T09:57:41.29Z',
              },
            },
          ],
        }),
      ),
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('overview.loading_deploys')),
    );

    expect(screen.getByRole('heading', { name: envNameTest })).toBeInTheDocument();
    expect(screen.getByText(textMock('overview.unavailable'))).toBeInTheDocument();
    expect(screen.getByText(textMock('overview.go_to_build_log'))).toBeInTheDocument();
  });
});
