import React from 'react';
import { screen } from '@testing-library/react';
import type { DeploymentLogListProps } from './DeploymentLogList';
import { DeploymentLogList } from './DeploymentLogList';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../../../../../test/testUtils';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { pipelineDeployment, environment } from 'app-shared/mocks/mocks';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { BuildResult } from 'app-shared/types/Build';
import { app, org } from '@studio/testing/testids';

// Test data
const defaultProps: DeploymentLogListProps = {
  orgEnvironmentList: [
    {
      ...environment,
      name: 'production',
      type: 'production',
    },
    {
      ...environment,
      name: 'tt02',
      type: 'test',
    },
  ],
  pipelineDeploymentList: [
    {
      ...pipelineDeployment,
      tagName: '2',
      envName: 'production',
      build: {
        ...pipelineDeployment.build,
        id: '2',
        result: BuildResult.succeeded,
        finished: new Date().toString(),
      },
    },
    {
      ...pipelineDeployment,
      tagName: '1',
      envName: 'tt02',
      build: {
        ...pipelineDeployment.build,
        id: '1',
        result: BuildResult.succeeded,
        finished: new Date().toString(),
      },
    },
  ],
};

const render = (
  props: Partial<DeploymentLogListProps> = {},
  queries: Partial<ServicesContextProps> = {},
) => {
  return renderWithProviders(<DeploymentLogList {...defaultProps} {...props} />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
    queries,
  });
};

describe('DeploymentLogList', () => {
  it('shows list of deployments', async () => {
    render();

    expect(
      screen.getByRole('heading', { name: textMock('overview.activity') }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        textMock('overview.deployment_log_list_title', {
          tagName: '2',
          envTitle: textMock('general.production_environment_alt'),
        }),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        textMock('overview.deployment_log_list_title', {
          tagName: '1',
          envTitle: `${textMock('general.test_environment_alt')} TT02`,
        }),
      ),
    ).toBeInTheDocument();
  });

  it('shows no activity message when deployments are empty', async () => {
    render({
      orgEnvironmentList: [],
      pipelineDeploymentList: [],
    });

    expect(
      screen.getByRole('heading', { name: textMock('overview.activity') }),
    ).toBeInTheDocument();
    expect(screen.getByText(textMock('overview.no_activity'))).toBeInTheDocument();
  });
});
