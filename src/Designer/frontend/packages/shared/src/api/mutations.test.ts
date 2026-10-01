import { updateAppPolicy, updateProcessState } from './mutations';
import { put, putWithRevision } from 'app-shared/utils/networking';
import { appPolicyPath, processStatePath } from './paths';
import type { ProcessChange, ProcessState } from '../types/api/ProcessState';
import type { Policy } from '../types/Policy';
import { app, org } from '@studio/testing/testids';

jest.mock('app-shared/utils/networking');

describe('updateProcessState', () => {
  afterEach(() => jest.clearAllMocks());

  it('submits the edit and expected version to the process-state endpoint', async () => {
    const change: ProcessChange = {
      bpmnXml: '<definitions />',
      metadata: { taskIdChange: { oldId: 'Task_1', newId: 'Task_2' } },
      expectedVersion: 'version-1',
    };

    await updateProcessState(org, app, change);

    expect(put).toHaveBeenCalledTimes(1);
    expect(put).toHaveBeenCalledWith(processStatePath(org, app), change);
  });

  it('returns the saved state from the server', async () => {
    const saved: ProcessState = { bpmnXml: '<definitions id="saved" />', version: 'version-2' };
    jest.mocked(put).mockResolvedValueOnce(saved);

    const result = await updateProcessState(org, app, {
      layoutSetDeletion: { layoutSetIdToUpdate: 'Task_1' },
      expectedVersion: 'version-1',
    });

    expect(result).toEqual(saved);
  });
});

describe('updateAppPolicy', () => {
  afterEach(() => jest.clearAllMocks());

  const policy: Policy = {
    revision: '"loaded-revision"',
    rules: [],
    requiredAuthenticationLevelEndUser: '3',
    requiredAuthenticationLevelOrg: '3',
  };

  it('saves the application policy through the revision adapter', async () => {
    await updateAppPolicy(org, app, policy);

    expect(putWithRevision).toHaveBeenCalledTimes(1);
    expect(putWithRevision).toHaveBeenCalledWith(appPolicyPath(org, app), policy);
  });

  it('returns the saved policy with its new revision', async () => {
    const saved: Policy = { ...policy, revision: '"saved-revision"' };
    jest.mocked(putWithRevision).mockResolvedValueOnce(saved);

    expect(await updateAppPolicy(org, app, policy)).toEqual(saved);
  });
});
