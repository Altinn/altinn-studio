import type { CreateRepoCommitPayload } from 'app-shared/types/api';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { useRepoCommitAndPushMutation } from './useRepoCommitAndPushMutation';
import { app, org } from '@studio/testing/testids';

describe('useRepoCommitAndPushMutation', () => {
  it('Calls commitAndPushChanges with correct arguments and payload', async () => {
    const result = renderHookWithProviders(() => useRepoCommitAndPushMutation(org, app)).result;

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
