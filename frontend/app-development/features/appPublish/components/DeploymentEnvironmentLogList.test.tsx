import React from 'react';
import type { DeploymentEnvironmentLogListProps } from './DeploymentEnvironmentLogList';
import { DeploymentEnvironmentLogList } from './DeploymentEnvironmentLogList';
import { screen } from '@testing-library/react';
import { renderWithProviders } from 'app-development/test/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { BuildResult, BuildStatus } from 'app-shared/types/Build';
import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';

const pipelineDeployment: PipelineDeployment = {
  id: '1',
  deploymentType: 'Deploy',
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

const defaultProps: DeploymentEnvironmentLogListProps = {
  envName: 'test',
  isProduction: false,
  pipelineDeploymentList: [],
};

const render = (
  props?: Partial<DeploymentEnvironmentLogListProps>,
  queries?: Partial<ServicesContextProps>,
) => {
  return renderWithProviders(queries)(
    <DeploymentEnvironmentLogList {...defaultProps} {...props} />,
  );
};
describe('DeploymentEnvironmentLogList', () => {
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

  it('does not render build log link when started date is null', () => {
    render({
      pipelineDeploymentList: [
        {
          ...pipelineDeployment,
          build: {
            ...pipelineDeployment.build,
            started: null,
          },
        },
      ],
    });
    expect(
      screen.queryByText(`${textMock('app_deployment.table.build_log_active_link')}`),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(`${textMock('app_deployment.table.build_log_expired_link')}`),
    ).not.toBeInTheDocument();
  });

  it('renders expired text when build log link is expired (> 30 days)', () => {
    render({
      pipelineDeploymentList: [
        {
          ...pipelineDeployment,
          build: {
            ...pipelineDeployment.build,
            started: new Date(null).toDateString(),
          },
        },
      ],
    });
    expect(
      screen.getByText(`${textMock('app_deployment.table.build_log_expired_link')}`),
    ).toBeInTheDocument();
  });

  it.each([
    [BuildResult.succeeded, 'app_deployment.pipeline_undeploy.build_result.succeeded'],
    [BuildResult.failed, 'app_deployment.pipeline_undeploy.build_result.failed'],
    [BuildResult.none, 'app_deployment.pipeline_undeploy.build_result.none'],
  ])('should display correct text when undeploy result is %s', (buildResult, expectedTextKey) => {
    render({
      pipelineDeploymentList: [
        {
          ...pipelineDeployment,
          deploymentType: 'Decommission',
          build: {
            ...pipelineDeployment.build,
            result: buildResult,
          },
        },
      ],
    });

    expect(screen.getByText(`${textMock(expectedTextKey)}`)).toBeInTheDocument();
  });

  it('renders build log link when started date is valid (< 30 days)', () => {
    render({
      pipelineDeploymentList: [
        {
          ...pipelineDeployment,
          build: {
            ...pipelineDeployment.build,
            started: new Date().toDateString(),
          },
        },
      ],
    });
    expect(
      screen.getByText(`${textMock('app_deployment.table.build_log_active_link')}`),
    ).toBeInTheDocument();
  });
});
