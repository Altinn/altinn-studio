import React from 'react';
import type { DeploymentListProps } from './DeploymentList';
import { DeploymentList } from './DeploymentList';
import { screen } from '@testing-library/react';
import { renderWithMockStore } from 'app-development/test/mocks';
import { textMock } from '../../../../testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { BuildResult, BuildStatus } from 'app-shared/types/Build';

const pipelineDeployment = {
  id: '1',
  tagName: '1',
  app: 'test',
  org: 'test',
  envName: 'tt02',
  createdBy: 'test',
  created: '',
  build: {
    id: '1',
    status: BuildStatus.none,
    result: BuildResult.succeeded,
    started: '',
    finished: '',
  },
};

const defaultProps: DeploymentListProps = {
  envName: 'test',
  isProduction: false,
  pipelineDeploymentList: [],
};

const render = (props?: Partial<DeploymentListProps>, queries?: Partial<ServicesContextProps>) => {
  return renderWithMockStore({}, queries)(<DeploymentList {...defaultProps} {...props} />);
};
describe('DeploymentList', () => {
  it('renders with no history', () => {
    render();
    expect(
      screen.getByText(
        textMock('app_deployment.table.deployed_version_history_empty', {
          envTitle: `${textMock('general.test_environment_alt').toLowerCase()} TEST`,
        }),
      ),
    ).toBeInTheDocument();
  });

  it('renders table', () => {
    render({
      pipelineDeploymentList: [pipelineDeployment],
    });
    expect(screen.getByText(`${textMock('app_deployment.table.status')}`)).toBeInTheDocument();
    expect(screen.getByText(`${textMock('app_deployment.table.version_col')}`)).toBeInTheDocument();
    expect(
      screen.getByText(`${textMock('app_deployment.table.available_version_col')}`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`${textMock('app_deployment.table.deployed_by_col')}`),
    ).toBeInTheDocument();
    expect(screen.getByText(`${textMock('app_deployment.table.build_log')}`)).toBeInTheDocument();
    expect(screen.getByText(pipelineDeployment.createdBy)).toBeInTheDocument();
  });

  it('renders title when environment is production', async () => {
    render({
      pipelineDeploymentList: [pipelineDeployment],
      envName: 'production',
      isProduction: true,
    });

    expect(
      screen.getByText(
        textMock('app_deployment.table.deployed_version_history', {
          envTitle: textMock('general.production_environment_alt').toLowerCase(),
        }),
      ),
    ).toBeInTheDocument();
  });

  it('renders title when environment is not production', async () => {
    render({
      pipelineDeploymentList: [pipelineDeployment],
      envName: 'tt02',
      isProduction: false,
    });

    expect(
      screen.getByText(
        textMock('app_deployment.table.deployed_version_history', {
          envTitle: `${textMock('general.test_environment_alt').toLowerCase()} TT02`,
        }),
      ),
    ).toBeInTheDocument();
  });

  it('renders when deployment is in progress', () => {
    render({
      pipelineDeploymentList: [
        {
          ...pipelineDeployment,
          build: {
            ...pipelineDeployment.build,
            result: BuildResult.none,
          },
        },
      ],
    });
    expect(
      screen.getByText(`${textMock('app_deployment.pipeline_deployment.build_result.none')}`),
    ).toBeInTheDocument();
  });

  it('renders when deployment failed', () => {
    render({
      pipelineDeploymentList: [
        {
          ...pipelineDeployment,
          build: {
            ...pipelineDeployment.build,
            result: BuildResult.failed,
          },
        },
      ],
    });
    expect(
      screen.getByText(`${textMock('app_deployment.pipeline_deployment.build_result.failed')}`),
    ).toBeInTheDocument();
  });

  it('renders when deployment canceled', () => {
    render({
      pipelineDeploymentList: [
        {
          ...pipelineDeployment,
          build: {
            ...pipelineDeployment.build,
            result: BuildResult.canceled,
          },
        },
      ],
    });
    expect(
      screen.getByText(`${textMock('app_deployment.pipeline_deployment.build_result.canceled')}`),
    ).toBeInTheDocument();
  });

  it('renders when deployment succeeded', () => {
    render({
      pipelineDeploymentList: [
        {
          ...pipelineDeployment,
          build: {
            ...pipelineDeployment.build,
            result: BuildResult.succeeded,
          },
        },
      ],
    });
    expect(
      screen.getByText(`${textMock('app_deployment.pipeline_deployment.build_result.succeeded')}`),
    ).toBeInTheDocument();
  });

  it('renders when deployment partially succeeded', () => {
    render({
      pipelineDeploymentList: [
        {
          ...pipelineDeployment,
          build: {
            ...pipelineDeployment.build,
            result: BuildResult.partiallySucceeded,
          },
        },
      ],
    });
    expect(
      screen.getByText(
        `${textMock('app_deployment.pipeline_deployment.build_result.partiallySucceeded')}`,
      ),
    ).toBeInTheDocument();
  });
});
