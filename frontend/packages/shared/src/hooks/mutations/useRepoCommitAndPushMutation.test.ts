import type { CreateRepoCommitPayload } from 'app-shared/types/api';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithMockStore } from 'app-development/test/mocks';
import { useRepoCommitAndPushMutation } from './useRepoCommitAndPushMutation';

// Test data:
const org = 'org';
const app = 'app';

describe('useRepoCommitAndPushMutation', () => {
  it('Calls commitAndPushChanges with correct arguments and payload', async () => {
    const result = renderHookWithMockStore()(() => useRepoCommitAndPushMutation(org, app))
      .renderHookResult.result;

    const commitMessage = 'test commit message';
    await result.current.mutateAsync({ commitMessage });

    expect(queriesMock.commitAndPushChanges).toHaveBeenCalledTimes(1);
    expect(queriesMock.commitAndPushChanges).toHaveBeenCalledWith(org, app, {
      message: commitMessage,
      org,
      repository: app,
    } as CreateRepoCommitPayload);
  });
});
