import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { DeploymentContainer } from './DeploymentContainer';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../../../../../test/testUtils';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { environment, repository } from 'app-shared/mocks/mocks';
import { app, org } from '@studio/testing/testids';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';

const render = (queries = {}) => {
  return renderWithProviders(<DeploymentContainer />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
    queries,
  });
};

describe('DeploymentContainer', () => {
  it('shows loading spinner when loading required data', () => {
    render();

    expect(screen.getByText(textMock('overview.deployments_loading'))).toBeInTheDocument();
  });

  it('shows an error message if an error occurs while loading data', async () => {
    render({
      getOrgList: jest.fn().mockImplementation(() => Promise.reject(createApiErrorMock())),
    });
    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('overview.deployments_loading')),
    );

    expect(screen.getByText(textMock('overview.deployments_error'))).toBeInTheDocument();
  });

  it('renders page', async () => {
    const envName = 'tt02';
    render({
      getEnvironments: jest.fn().mockImplementation(() =>
        Promise.resolve([
          {
            ...environment,
            name: envName,
          },
        ]),
      ),
      getOrgList: jest.fn().mockImplementation(() =>
        Promise.resolve({
          orgs: {
            [org]: {
              environments: [envName],
            },
          },
        }),
      ),
      getRepoMetadata: jest.fn().mockImplementation(() =>
        Promise.resolve({
          ...repository,
          owner: {
            ...repository.owner,
            login: org,
          },
        }),
      ),
    });
    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('overview.deployments_loading')),
    );

    expect(screen.getByText(textMock('overview.activity'))).toBeInTheDocument();
  });
});
