import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { DeploymentStatusList } from './DeploymentStatusList';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../../../../../test/testUtils';
import { environment, runningApp } from 'app-shared/mocks/mocks';
import { app, org } from '@studio/testing/testids';
import type { DeploymentStatusProps } from './DeploymentStatus';

vi.mock('./DeploymentStatus', () => ({
  DeploymentStatus: ({ envName, runningApp: running, isStatusUnknown }: DeploymentStatusProps) => (
    <div>
      {envName}: {isStatusUnknown ? 'unknown' : (running?.version ?? 'not running')}
    </div>
  ),
}));

describe('DeploymentStatusList', () => {
  it('shows what runs in each environment, and where that is unknown', () => {
    renderWithProviders(
      <DeploymentStatusList
        orgEnvironmentList={['tt02', 'at22', 'production'].map((name) => ({
          ...environment,
          name,
          type: 'test',
        }))}
        pipelineDeploymentList={[]}
        environmentList={[
          {
            environment: 'tt02',
            state: 'running',
            runningApp: { ...runningApp, environment: 'tt02', version: '2' },
          },
          { environment: 'at22', state: 'notRunning' },
          { environment: 'production', state: 'unknown' },
        ]}
      />,
      { startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}` },
    );

    expect(screen.getByText('tt02: 2')).toBeInTheDocument();
    expect(screen.getByText('at22: not running')).toBeInTheDocument();
    expect(screen.getByText('production: unknown')).toBeInTheDocument();
  });
});
