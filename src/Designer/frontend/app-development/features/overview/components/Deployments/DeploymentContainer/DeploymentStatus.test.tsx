import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import type { DeploymentStatusProps } from './DeploymentStatus';
import { DeploymentStatus } from './DeploymentStatus';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../../../../../test/testUtils';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { runningApp } from 'app-shared/mocks/mocks';
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
      ...runningApp,
      deploymentType: 'Decommission',
    });

    expect(screen.getByText(textMock('app_deployment.status.none'))).toBeInTheDocument();
  });

  it('shows alert when the deployment status is unavailable', async () => {
    render({
      runningApp,
    });

    expect(screen.getByText(textMock('app_deployment.status.unavailable'))).toBeInTheDocument();
  });

  it('shows alert when the deployment is successful', async () => {
    render({
      runningApp: {
        ...runningApp,
        version: '1',
      },
    });

    expect(screen.getByText(textMock('app_deployment.status.succeeded'))).toBeInTheDocument();
  });
  it('shows that the app is updating while its instances are replaced', async () => {
    render({ runningApp: { ...runningApp, version: '1', status: 'updating' } });

    expect(screen.getByText(textMock('app_deployment.status.inProgress'))).toBeInTheDocument();
  });

  it('shows that the app is restarting when it was restarted after it was published', async () => {
    render({
      runningApp: {
        ...runningApp,
        version: '1',
        status: 'updating',
        restartedAt: '2026-10-31T10:42:00+00:00',
      },
      lastPublishedDate: '2026-10-30T10:00:00+00:00',
    });

    expect(screen.getByText(textMock('app_deployment.status.restarting'))).toBeInTheDocument();
  });

  it('shows that the app is updating when it was published after it was restarted', async () => {
    render({
      runningApp: {
        ...runningApp,
        version: '1',
        status: 'updating',
        restartedAt: '2026-10-30T10:00:00+00:00',
      },
      lastPublishedDate: '2026-10-31T10:42:00+00:00',
    });

    expect(screen.getByText(textMock('app_deployment.status.inProgress'))).toBeInTheDocument();
  });

  it('shows that the app does not respond when it is unavailable', async () => {
    render({ runningApp: { ...runningApp, version: '1', status: 'unavailable' } });

    expect(screen.getByText(textMock('app_deployment.status.not_responding'))).toBeInTheDocument();
  });

  it('shows that the update failed when it failed', async () => {
    render({ runningApp: { ...runningApp, version: '1', status: 'failed' } });

    expect(screen.getByText(textMock('app_deployment.status.update_failed'))).toBeInTheDocument();
  });
});
