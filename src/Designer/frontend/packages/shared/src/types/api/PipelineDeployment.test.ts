import { describe, expect, it } from 'vitest';
import { build, runningApp, pipelineDeployment } from 'app-shared/mocks/mocks';
import type { RunningApp } from './RunningApp';
import { findRunningPipelineDeployment, type PipelineDeployment } from './PipelineDeployment';

const deploy = (buildId: string, tagName: string): PipelineDeployment => ({
  ...pipelineDeployment,
  tagName,
  build: { ...build, id: buildId },
});

const running = (version: string, buildId: string | null): RunningApp => ({
  ...runningApp,
  version,
  buildId,
});

describe('findRunningPipelineDeployment', () => {
  // Newest first, as the deployments endpoint returns them: the tag was deployed twice.
  const redeploy = deploy('300', '2');
  const firstDeploy = deploy('100', '2');
  const pipelineDeployments = [redeploy, deploy('200', '1'), firstDeploy];

  it('finds the deploy whose build runs, even when its tag was deployed again', () => {
    expect(findRunningPipelineDeployment(pipelineDeployments, running('2', '100'))).toBe(
      firstDeploy,
    );
  });

  it('finds nothing when the running build is not in the list', () => {
    expect(findRunningPipelineDeployment(pipelineDeployments, running('2', '999'))).toBeUndefined();
  });

  it('finds nothing when another Studio deployed what runs, though this Studio deployed the same tag', () => {
    // Its build id comes from the same Azure DevOps organization, so no deploy here has it.
    expect(findRunningPipelineDeployment(pipelineDeployments, running('2', '400'))).toBeUndefined();
  });

  it('falls back to the newest deploy of the tag when the build was not recorded', () => {
    expect(findRunningPipelineDeployment(pipelineDeployments, running('2', null))).toBe(redeploy);
  });

  it('finds nothing when nothing runs', () => {
    expect(findRunningPipelineDeployment(pipelineDeployments, undefined)).toBeUndefined();
  });
});
