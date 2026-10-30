import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { DeploymentStatusList } from './DeploymentStatusList';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../../../../../test/testUtils';
import { build, environment, pipelineDeployment, runningApp } from 'app-shared/mocks/mocks';
import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';
import { BuildResult } from 'app-shared/types/Build';
import { app, org } from '@studio/testing/testids';
import type { DeploymentStatusProps } from './DeploymentStatus';

vi.mock('./DeploymentStatus', () => ({
  DeploymentStatus: ({ lastPublishedDate }: DeploymentStatusProps) => (
    <div>published {lastPublishedDate}</div>
  ),
}));

const deploy = (buildId: string, finished: string): PipelineDeployment => ({
  ...pipelineDeployment,
  envName: 'tt02',
  tagName: '2',
  build: { ...build, id: buildId, result: BuildResult.succeeded, finished },
});

describe('DeploymentStatusList', () => {
  it('shows when the running build was published, though its tag was deployed again since', () => {
    renderWithProviders(
      <DeploymentStatusList
        orgEnvironmentList={[{ ...environment, name: 'tt02', type: 'test' }]}
        pipelineDeploymentList={[
          deploy('300', '2026-10-02T12:00:00Z'),
          deploy('100', '2026-10-01T12:00:00Z'),
        ]}
        runningAppList={[{ ...runningApp, environment: 'tt02', version: '2', buildId: '100' }]}
      />,
      { startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}` },
    );

    expect(screen.getByText('published 2026-10-01T12:00:00Z')).toBeInTheDocument();
  });
});
