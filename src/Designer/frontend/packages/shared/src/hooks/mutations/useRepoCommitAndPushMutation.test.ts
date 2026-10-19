import { describe, expect, it } from 'vitest';
import type { CreateRepoCommitPayload } from 'app-shared/types/api';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { useRepoCommitAndPushMutation } from './useRepoCommitAndPushMutation';
import { app, org } from '@studio/testing/testids';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

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

  it('Invalidates the branch status of every branch in the repository', async () => {
    const queryClient = createQueryClientMock();
    const masterKey = [QueryKey.BranchStatus, org, app, 'master'];
    const featureBranchKey = [QueryKey.BranchStatus, org, app, 'feature/x'];
    queryClient.setQueryData(masterKey, {});
    queryClient.setQueryData(featureBranchKey, {});
    const result = renderHookWithProviders(() => useRepoCommitAndPushMutation(org, app), {
      queryClient,
    }).result;

    await result.current.mutateAsync({ commitMessage: 'test commit message' });

    expect(queryClient.getQueryState(masterKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(featureBranchKey)?.isInvalidated).toBe(true);
  });
});
