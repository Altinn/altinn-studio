import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useMutation } from '@tanstack/react-query';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import { mockRepoStatus } from '../../test/mocks/versionControlContextMock';
import {
  REFRESH_DELAY_MS,
  useRefreshRepoStatusAfterChanges,
} from './useRefreshRepoStatusAfterChanges';

const repoStatusQueryKey = [QueryKey.RepoStatus, org, app];

describe('useRefreshRepoStatusAfterChanges', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('should refresh the repository status once after a series of saves', async () => {
    const { result, queryClient, invalidateQueries } = renderSave(() => Promise.resolve());
    queryClient.setQueryData(repoStatusQueryKey, mockRepoStatus);

    await act(() => result.current.mutateAsync());
    await wait(REFRESH_DELAY_MS / 2);
    await act(() => result.current.mutateAsync());
    await wait(REFRESH_DELAY_MS / 2);
    expect(invalidateQueries).not.toHaveBeenCalled();

    await wait(REFRESH_DELAY_MS / 2);
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: repoStatusQueryKey });
  });

  it('should not refresh the repository status when there is already something to share', async () => {
    const { result, queryClient, invalidateQueries } = renderSave(() => Promise.resolve());
    queryClient.setQueryData(repoStatusQueryKey, { ...mockRepoStatus, aheadBy: 1 });

    await act(() => result.current.mutateAsync());
    await wait(REFRESH_DELAY_MS);

    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it('should not refresh the repository status when a change fails', async () => {
    const { result, invalidateQueries } = renderSave(() => Promise.reject(new Error('Not saved')));

    await act(() => expect(result.current.mutateAsync()).rejects.toThrow('Not saved'));
    await wait(REFRESH_DELAY_MS);

    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});

const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

const renderSave = (save: () => Promise<void>) => {
  const queryClient = createQueryClientMock();
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
  const { result } = renderHookWithProviders(
    () => {
      useRefreshRepoStatusAfterChanges(org, app);
      return useMutation({ mutationFn: save, meta: { hideDefaultError: true } });
    },
    { queryClient },
  );
  return { result, queryClient, invalidateQueries };
};
