import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { AppEnvironments } from './AppEnvironments';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../../../test/testUtils';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { deployEnvironment } from 'app-shared/mocks/mocks';

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
    render();

    expect(screen.getByText(textMock('overview.loading_env'))).toBeInTheDocument();
  });

  it('shows error message if an error occured while fetching required data', async () => {
    render({
      getEnvironments: jest.fn().mockImplementation(() => Promise.reject()),
      getOrgList: jest.fn().mockImplementation(() => Promise.reject()),
    });

    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('overview.loading_env')));

    expect(screen.getByText(textMock('overview.app_environments_error'))).toBeInTheDocument();
  });

  it('shows no environments message when organization has no environment', async () => {
    render();

    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('overview.loading_env')));

    expect(
      screen.getByRole('heading', { name: textMock('app_deployment.no_env_title') }),
    ).toBeInTheDocument();
    expect(screen.getByText(textMock('app_deployment.no_env_1'))).toBeInTheDocument();
    expect(screen.getByText(textMock('app_deployment.no_env_2'))).toBeInTheDocument();
  });

  it('shows statuses when organization has environments', async () => {
    const envName = 'tt02';
    render({
      getEnvironments: jest.fn().mockImplementation(() =>
        Promise.resolve([
          {
            ...deployEnvironment,
            name: envName,
          },
        ]),
      ),
      getOrgList: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ orgs: { [org]: { environments: [envName] } } }),
        ),
    });

    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('overview.loading_env')));

    expect(screen.getByRole('heading', { name: envName })).toBeInTheDocument();
    expect(
      screen.getByText(textMock('app_deployment.kubernetes_deployment.status.none')),
    ).toBeInTheDocument();
  });
});
