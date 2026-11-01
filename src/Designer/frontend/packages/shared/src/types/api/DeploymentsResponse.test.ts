import { describe, expect, it } from 'vitest';
import { runningApp } from 'app-shared/mocks/mocks';
import { environmentsOf } from './DeploymentsResponse';

describe('environmentsOf', () => {
  it('gives the environment list the backend sends', () => {
    const environmentList = [{ environment: 'tt02', state: 'unknown' as const }];

    expect(
      environmentsOf({
        pipelineDeploymentList: [],
        environmentList,
        runningAppList: [{ ...runningApp, environment: 'at22' }],
      }),
    ).toBe(environmentList);
  });

  it('makes the running apps of a backend older than the frontend into environments', () => {
    const tt02 = { ...runningApp, environment: 'tt02', version: '2' };

    expect(environmentsOf({ pipelineDeploymentList: [], runningAppList: [tt02] })).toEqual([
      { environment: 'tt02', state: 'running', runningApp: tt02 },
    ]);
  });

  it('gives no environments when there is no response yet', () => {
    expect(environmentsOf(undefined)).toEqual([]);
  });
});
