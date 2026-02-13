import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { DeploymentContainer } from './DeploymentContainer';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { renderWithProviders } from 'app-development/test/mocks';
import { environment, pipelineDeployment } from 'app-shared/mocks/mocks';
import type { DeploymentsResponse } from 'app-shared/types/api/DeploymentsResponse';
import { org } from '@studio/testing/testids';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';
import { BuildResult } from 'app-shared/types/Build';
import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';

describe('DeploymentContainer', () => {
  it('renders a spinner while loading data', () => {
    render();

    expect(screen.getByLabelText(textMock('app_deployment.loading'))).toBeInTheDocument();
  });

  it('renders an error message if an error occurs while loading data', async () => {
    render({
      getEnvironments: jest.fn().mockImplementation(() => Promise.reject(createApiErrorMock())),
    });
    await waitForElementToBeRemoved(() =>
      screen.queryByLabelText(textMock('app_deployment.loading')),
    );

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
    await waitForElementToBeRemoved(() =>
      screen.queryByLabelText(textMock('app_deployment.loading')),
    );

    expect(screen.getByText(envName.toUpperCase())).toBeInTheDocument();
  });

  it('filters out deployments with build result none except the first one', async () => {
    const envName = 'tt02';
    const firstDeployment: PipelineDeployment = {
      ...pipelineDeployment,
      envName,
      tagName: 'v1.0.0',
      build: { ...pipelineDeployment.build, id: 'build-1', result: BuildResult.none },
    };
    const secondDeploymentWithNone: PipelineDeployment = {
      ...pipelineDeployment,
      envName,
      tagName: 'v2.0.0',
      build: { ...pipelineDeployment.build, id: 'build-2', result: BuildResult.none },
    };
    const thirdDeploymentWithSuccess: PipelineDeployment = {
      ...pipelineDeployment,
      envName,
      tagName: 'v3.0.0',
      build: { ...pipelineDeployment.build, id: 'build-3', result: BuildResult.succeeded },
    };

    render({
      getEnvironments: jest
        .fn()
        .mockImplementation(() => Promise.resolve([{ ...environment, name: envName }])),
      getOrgList: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ orgs: { [org]: { name: { nb: org }, environments: [envName] } } }),
        ),
      getDeployments: jest.fn().mockImplementation(() =>
        Promise.resolve<DeploymentsResponse>({
          pipelineDeploymentList: [
            firstDeployment,
            secondDeploymentWithNone,
            thirdDeploymentWithSuccess,
          ],
          kubernetesDeploymentList: [],
        }),
      ),
    });
    await waitForElementToBeRemoved(() =>
      screen.queryByLabelText(textMock('app_deployment.loading')),
    );

    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    expect(screen.queryByText('v2.0.0')).not.toBeInTheDocument();
    expect(screen.getByText('v3.0.0')).toBeInTheDocument();
  });

  it('shows all deployments when none have build result none', async () => {
    const envName = 'tt02';
    const firstDeployment: PipelineDeployment = {
      ...pipelineDeployment,
      envName,
      tagName: 'v1.0.0',
      build: { ...pipelineDeployment.build, id: 'build-1', result: BuildResult.succeeded },
    };
    const secondDeployment: PipelineDeployment = {
      ...pipelineDeployment,
      envName,
      tagName: 'v2.0.0',
      build: { ...pipelineDeployment.build, id: 'build-2', result: BuildResult.failed },
    };

    render({
      getEnvironments: jest
        .fn()
        .mockImplementation(() => Promise.resolve([{ ...environment, name: envName }])),
      getOrgList: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ orgs: { [org]: { name: { nb: org }, environments: [envName] } } }),
        ),
      getDeployments: jest.fn().mockImplementation(() =>
        Promise.resolve<DeploymentsResponse>({
          pipelineDeploymentList: [firstDeployment, secondDeployment],
          kubernetesDeploymentList: [],
        }),
      ),
    });
    await waitForElementToBeRemoved(() =>
      screen.queryByLabelText(textMock('app_deployment.loading')),
    );

    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    expect(screen.getByText('v2.0.0')).toBeInTheDocument();
  });
});

const render = (queries?: Partial<ServicesContextProps>) => {
  return renderWithProviders(queries)(<DeploymentContainer />);
};
