import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useMutation } from '@tanstack/react-query';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import { mockRepoStatus } from '../../test/mocks/versionControlContextMock';
import type { RepoStatus } from 'app-shared/types/RepoStatus';
import {
  REFRESH_DELAY_MS,
  useRefreshRepoStatusAfterChanges,
} from './useRefreshRepoStatusAfterChanges';

const repoStatusQueryKey = [QueryKey.RepoStatus, org, app];

describe('useRefreshRepoStatusAfterChanges', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('should refresh the repository status once after a series of saves', async () => {
    const { result, invalidateQueries } = renderSave(() => Promise.resolve());

    await act(() => result.current.mutateAsync());
    await wait(REFRESH_DELAY_MS / 2);
    await act(() => result.current.mutateAsync());
    await wait(REFRESH_DELAY_MS / 2);
    expect(invalidateQueries).not.toHaveBeenCalled();

    await wait(REFRESH_DELAY_MS / 2);
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: repoStatusQueryKey });
  });

  it('should wait for a status request that is still running', async () => {
    const { result, queryClient, invalidateQueries } = renderSave(() => Promise.resolve());
    let finishRequest: (status: RepoStatus) => void;
    void queryClient.fetchQuery({
      queryKey: repoStatusQueryKey,
      queryFn: () => new Promise<RepoStatus>((resolve) => (finishRequest = resolve)),
    });

    await act(() => result.current.mutateAsync());
    await wait(REFRESH_DELAY_MS);
    expect(invalidateQueries).not.toHaveBeenCalled();

    await act(async () => finishRequest(mockRepoStatus));
    await wait(REFRESH_DELAY_MS);
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
  });

  it('should leave the refresh to a change that refreshes the status itself', async () => {
    const { result, invalidateQueries } = renderSave(() => Promise.resolve(), {
      refreshesRepoStatus: true,
    });

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

const renderSave = (save: () => Promise<void>, meta: Record<string, unknown> = {}) => {
  const queryClient = createQueryClientMock();
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
  const { result } = renderHookWithProviders(
    () => {
      useRefreshRepoStatusAfterChanges(org, app);
      return useMutation({ mutationFn: save, meta: { hideDefaultError: true, ...meta } });
    },
    { queryClient },
  );
  return { result, queryClient, invalidateQueries };
};
