import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useMutation, useQuery } from '@tanstack/react-query';
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

  it('should leave the refresh to a change that refreshes a loaded status itself', async () => {
    const { result, queryClient, requests } = renderWithStatusAndSaveThatRefreshesIt({
      awaitRefresh: false,
      loadedStatus: statusBeforeSave,
    });
    act(() => void result.current.status.refetch());
    expect(requests).toHaveLength(1);

    await act(() => result.current.save.mutateAsync());
    expect(requests).toHaveLength(2);
    await act(async () => requests[0](statusBeforeSave));
    await act(async () => requests[1](statusAfterSave));
    await wait(REFRESH_DELAY_MS * 2);

    expect(requests).toHaveLength(2);
    expect(queryClient.getQueryData(repoStatusQueryKey)).toEqual(statusAfterSave);
  });

  it.each([false, true])(
    'should refresh after a change that refreshes the status itself while the first status loads, awaiting its refresh: %s',
    async (awaitRefresh) => {
      const { result, queryClient, requests, refreshStarted } =
        renderWithStatusAndSaveThatRefreshesIt({
          awaitRefresh,
        });
      expect(requests).toHaveLength(1);

      let saved: Promise<void>;
      await act(async () => {
        saved = result.current.save.mutateAsync();
        await refreshStarted;
      });
      expect(requests).toHaveLength(1);
      await act(async () => {
        requests[0](statusBeforeSave);
        await saved;
      });
      await wait(REFRESH_DELAY_MS);
      expect(requests).toHaveLength(2);
      await act(async () => requests[1](statusAfterSave));

      expect(queryClient.getQueryData(repoStatusQueryKey)).toEqual(statusAfterSave);
    },
  );

  it('should wait for a change that is still running', async () => {
    const { result, invalidateQueries } = renderChanges();
    const slowSave = deferred();

    await act(() => result.current.save.mutateAsync(undefined));
    act(() => void result.current.save.mutateAsync(slowSave.promise));
    await wait(REFRESH_DELAY_MS * 2);
    expect(invalidateQueries).not.toHaveBeenCalled();

    await act(async () => slowSave.resolve());
    await wait(REFRESH_DELAY_MS);
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
  });

  it('should not refresh after a change that leaves the repository unchanged', async () => {
    const { result, invalidateQueries } = renderChanges();

    await act(() => result.current.createPreview.mutateAsync());
    await wait(REFRESH_DELAY_MS * 2);

    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it('should drop a pending refresh that a later change refreshing the status itself covers', async () => {
    const { result, invalidateQueries } = renderChanges(statusBeforeSave);

    await act(() => result.current.save.mutateAsync(undefined));
    await wait(REFRESH_DELAY_MS / 2);
    await act(() => result.current.share.mutateAsync(undefined));
    await wait(REFRESH_DELAY_MS * 2);

    expect(invalidateQueries).toHaveBeenCalledTimes(1);
  });

  it('should keep the refresh for a change that succeeds while a change refreshing the status itself runs', async () => {
    const { result, invalidateQueries } = renderChanges(statusBeforeSave);
    const share = deferred();

    act(() => void result.current.share.mutateAsync(share.promise));
    await wait(REFRESH_DELAY_MS / 2);
    await act(() => result.current.save.mutateAsync(undefined));
    await act(async () => share.resolve());
    await wait(REFRESH_DELAY_MS * 2);

    expect(invalidateQueries).toHaveBeenCalledTimes(2);
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

const statusBeforeSave: RepoStatus = { ...mockRepoStatus, contentStatus: [] };
const statusAfterSave: RepoStatus = {
  ...mockRepoStatus,
  contentStatus: [{ filePath: 'App/ui/layouts/Side1.json', fileStatus: 'ModifiedInWorkdir' }],
};

// The header's status, shown, and a save that refreshes it itself when it succeeds, as resourceadm's saves do. Each
// status request waits in requests until the test answers it.
const renderWithStatusAndSaveThatRefreshesIt = ({
  awaitRefresh,
  loadedStatus,
}: {
  awaitRefresh: boolean;
  loadedStatus?: RepoStatus;
}) => {
  const queryClient = createQueryClientMock();
  if (loadedStatus) queryClient.setQueryData(repoStatusQueryKey, loadedStatus);
  const requests: Array<(status: RepoStatus) => void> = [];
  let startRefresh: () => void;
  const refreshStarted = new Promise<void>((resolve) => (startRefresh = resolve));
  const { result } = renderHookWithProviders(
    () => {
      useRefreshRepoStatusAfterChanges(org, app);
      const status = useQuery({
        queryKey: repoStatusQueryKey,
        queryFn: () => new Promise<RepoStatus>((resolve) => requests.push(resolve)),
        staleTime: Infinity,
      });
      const save = useMutation({
        mutationFn: () => Promise.resolve(),
        meta: { hideDefaultError: true, refreshesRepoStatus: true },
        onSuccess: () => {
          const refresh = queryClient.invalidateQueries({ queryKey: repoStatusQueryKey });
          startRefresh();
          return awaitRefresh ? refresh : undefined;
        },
      });
      return { status, save };
    },
    { queryClient },
  );
  return { result, queryClient, requests, refreshStarted };
};

const deferred = () => {
  let resolve: () => void;
  const promise = new Promise<void>((done) => (resolve = done));
  return { promise, resolve: () => resolve() };
};

// The header's status, shown, and the kinds of change Studio makes. A save and a share finish when the promise they are
// given does, or at once without one.
const renderChanges = (loadedStatus?: RepoStatus) => {
  const queryClient = createQueryClientMock();
  if (loadedStatus) queryClient.setQueryData(repoStatusQueryKey, loadedStatus);
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
  const finishes = (done?: Promise<void>) => done ?? Promise.resolve();
  const { result } = renderHookWithProviders(
    () => {
      useRefreshRepoStatusAfterChanges(org, app);
      useQuery({
        queryKey: repoStatusQueryKey,
        queryFn: () => Promise.resolve(mockRepoStatus),
        staleTime: Infinity,
      });
      return {
        save: useMutation({ mutationFn: finishes, meta: { hideDefaultError: true } }),
        share: useMutation({
          mutationFn: finishes,
          meta: { hideDefaultError: true, refreshesRepoStatus: true },
          onSuccess: () => void queryClient.invalidateQueries({ queryKey: repoStatusQueryKey }),
        }),
        createPreview: useMutation({
          mutationFn: () => Promise.resolve(),
          meta: { hideDefaultError: true, leavesRepoUnchanged: true },
        }),
      };
    },
    { queryClient },
  );
  return { result, queryClient, invalidateQueries };
};
