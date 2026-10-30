import { describe, expect, it } from 'vitest';
import { build, runningApp, pipelineDeployment } from 'app-shared/mocks/mocks';
import type { RunningApp } from './RunningApp';
import { findRunningPipelineDeployment, type PipelineDeployment } from './PipelineDeployment';

const deploy = (buildId: string, tagName: string): PipelineDeployment => ({
  ...pipelineDeployment,
  tagName,
  build: { ...build, id: buildId },
});

const fromThisStudio = (version: string, buildId: string): RunningApp => ({
  ...runningApp,
  version,
  deployedFromThisStudio: true,
  buildId,
});

const fromStudio = (version: string, deployedFromThisStudio: false | null): RunningApp => ({
  ...runningApp,
  version,
  deployedFromThisStudio,
  buildId: null,
});

describe('findRunningPipelineDeployment', () => {
  // Newest first, as the deployments endpoint returns them: the tag was deployed twice.
  const redeploy = deploy('300', '2');
  const firstDeploy = deploy('100', '2');
  const pipelineDeployments = [redeploy, deploy('200', '1'), firstDeploy];

  it('finds the deploy whose build runs, even when its tag was deployed again', () => {
    expect(findRunningPipelineDeployment(pipelineDeployments, fromThisStudio('2', '100'))).toBe(
      firstDeploy,
    );
  });

  it('finds nothing when the running build is not in the list', () => {
    expect(
      findRunningPipelineDeployment(pipelineDeployments, fromThisStudio('2', '999')),
    ).toBeUndefined();
  });

  it('finds nothing when another Studio deployed what runs, though this Studio deployed the same tag', () => {
    expect(
      findRunningPipelineDeployment(pipelineDeployments, fromStudio('2', false)),
    ).toBeUndefined();
  });

  it('falls back to the newest deploy of the tag when it is unknown which Studio deployed it', () => {
    expect(findRunningPipelineDeployment(pipelineDeployments, fromStudio('2', null))).toBe(
      redeploy,
    );
  });

  it('finds nothing when nothing runs', () => {
    expect(findRunningPipelineDeployment(pipelineDeployments, undefined)).toBeUndefined();
  });
});
