import React from 'react';
import { screen } from '@testing-library/react';
import type { DeploymentStatusProps } from './DeploymentStatus';
import { DeploymentStatus } from './DeploymentStatus';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../../../../../test/testUtils';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { kubernetesDeployment } from 'app-shared/mocks/mocks';
import { app, org } from '@studio/testing/testids';

// Test data
const defaultProps: DeploymentStatusProps = {
  deploymentType: 'Deploy',
  envName: 'tt02',
  isProduction: false,
};

const render = (props: Partial<DeploymentStatusProps> = {}) => {
  return renderWithProviders(<DeploymentStatus {...defaultProps} {...props} />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
  });
};

describe('DeploymentStatus', () => {
  it('shows production when environment is production', async () => {
    render({
      envName: 'production',
      isProduction: true,
    });

    expect(screen.getByText(textMock('general.production'))).toBeInTheDocument();
  });

  it('shows environment name when environment is not production', async () => {
    render({
      envName: 'tt02',
      isProduction: false,
    });

    expect(screen.getByText('TT02')).toBeInTheDocument();
  });

  it('shows alert when the deployment is in progress', async () => {
    render({
      isDeploymentInProgress: true,
    });

    expect(screen.getByText(textMock('app_deployment.status.inProgress'))).toBeInTheDocument();
  });

  it('shows alert when no app is deployed', async () => {
    render();

    expect(screen.getByText(textMock('app_deployment.status.none'))).toBeInTheDocument();
  });

  it('shows alert when no app is deployed when app is decommissioned', async () => {
    render({
      ...kubernetesDeployment,
      deploymentType: 'Decommission',
    });

    expect(screen.getByText(textMock('app_deployment.status.none'))).toBeInTheDocument();
  });

  it('shows alert when the deployment status is unavailable', async () => {
    render({
      kubernetesDeployment,
    });

    expect(screen.getByText(textMock('app_deployment.status.unavailable'))).toBeInTheDocument();
  });

  it('shows alert when the deployment is successful', async () => {
    render({
      kubernetesDeployment: {
        ...kubernetesDeployment,
        version: '1',
      },
    });

    expect(screen.getByText(textMock('app_deployment.status.succeeded'))).toBeInTheDocument();
  });
});
