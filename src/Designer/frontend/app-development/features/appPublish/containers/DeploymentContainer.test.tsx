import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { DeploymentContainer } from './DeploymentContainer';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { renderWithProviders } from '../../../test/mocks';
import { environment } from 'app-shared/mocks/mocks';
import type { DeploymentsResponse } from 'app-shared/types/api/DeploymentsResponse';
import { org } from '@studio/testing/testids';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';

describe('DeploymentContainer', () => {
  it('renders a spinner while loading data', () => {
    render();

    expect(screen.getByTitle(textMock('app_deployment.loading'))).toBeInTheDocument();
  });

  it('renders an error message if an error occurs while loading data', async () => {
    render({
      getEnvironments: jest.fn().mockImplementation(() => Promise.reject(createApiErrorMock())),
    });
    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('app_deployment.loading')));

    expect(screen.getByText(textMock('app_deployment.error'))).toBeInTheDocument();
  });

  it('renders org environments', async () => {
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
      getOrgList: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ orgs: { [org]: { name: { nb: org }, environments: [envName] } } }),
        ),
      getDeployments: jest.fn().mockImplementation(() =>
        Promise.resolve<DeploymentsResponse>({
          pipelineDeploymentList: [],
          kubernetesDeploymentList: [],
        }),
      ),
    });
    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('app_deployment.loading')));

    expect(screen.getByText(envName.toUpperCase())).toBeInTheDocument();
  });
});

const render = (queries?: Partial<ServicesContextProps>) => {
  return renderWithProviders(queries)(<DeploymentContainer />);
};
