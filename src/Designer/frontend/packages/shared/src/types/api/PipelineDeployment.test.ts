import { describe, expect, it } from 'vitest';
import { build, runningDeployment, pipelineDeployment } from 'app-shared/mocks/mocks';
import type { RunningDeployment } from './RunningDeployment';
import { findRunningPipelineDeployment, type PipelineDeployment } from './PipelineDeployment';

const deploy = (buildId: string, tagName: string): PipelineDeployment => ({
  ...pipelineDeployment,
  tagName,
  build: { ...build, id: buildId },
});

const running = (version: string, buildId?: string | null): RunningDeployment => ({
  ...runningDeployment,
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

  it.each([null, undefined])(
    'falls back to the newest deploy of the tag when the build id is %s',
    (buildId) => {
      expect(findRunningPipelineDeployment(pipelineDeployments, running('2', buildId))).toBe(
        redeploy,
      );
    },
  );

  it('finds nothing when nothing runs', () => {
    expect(findRunningPipelineDeployment(pipelineDeployments, undefined)).toBeUndefined();
  });
});
