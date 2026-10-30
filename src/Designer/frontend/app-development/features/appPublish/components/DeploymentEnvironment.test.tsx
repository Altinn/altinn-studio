import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { DeploymentEnvironment } from './DeploymentEnvironment';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../../../test/testUtils';
import { build, pipelineDeployment, runningApp } from 'app-shared/mocks/mocks';
import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';
import { BuildResult } from 'app-shared/types/Build';
import { app, org } from '@studio/testing/testids';

const deploy = (buildId: string, finished: string): PipelineDeployment => ({
  ...pipelineDeployment,
  envName: 'tt02',
  tagName: '2',
  build: { ...build, id: buildId, result: BuildResult.succeeded, finished },
});

describe('DeploymentEnvironment', () => {
  it('shows when the running build was published, though its tag was deployed again since', () => {
    renderWithProviders(
      <DeploymentEnvironment
        pipelineDeploymentList={[
          deploy('300', '2026-10-02T12:00:00Z'),
          deploy('100', '2026-10-01T12:00:00Z'),
        ]}
        runningApp={{
          ...runningApp,
          environment: 'tt02',
          version: '2',
          buildId: '100',
        }}
        envName='tt02'
        isProduction={false}
        orgName={org}
      />,
      { startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/deploy` },
    );

    expect(screen.getByText(/app_deployment\.last_published.*01\.10\.2026/)).toBeInTheDocument();
  });
});
