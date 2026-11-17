import { describe, expect, it } from 'vitest';
import { environmentsOf } from './DeploymentsResponse';

describe('environmentsOf', () => {
  it('gives the environment list the backend sends', () => {
    const environmentList = [{ environment: 'tt02', state: 'unknown' as const }];

    expect(environmentsOf({ pipelineDeploymentList: [], environmentList })).toBe(environmentList);
  });

  it('gives no environments when there is no response yet', () => {
    expect(environmentsOf(undefined)).toEqual([]);
  });
});
