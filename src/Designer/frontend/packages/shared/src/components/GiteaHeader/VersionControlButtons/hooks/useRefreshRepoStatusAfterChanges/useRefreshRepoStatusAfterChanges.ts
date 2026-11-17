import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';

export const REFRESH_DELAY_MS = 1000;

// Studio saves every change to the user's copy of the repository, so any change can change what there is to share.
// The status request fetches from Gitea and holds the repository lock, which saves wait for. So the refresh waits for a
// pause in the changes, for changes that are still running, and for a status request that is still running.
//
// A mutation's meta can say more:
// - leavesRepoUnchanged: it doesn't touch the repository, so there is nothing to refresh.
// - refreshesRepoStatus: it refreshes the status itself. If a status had loaded when it started, its refresh replaces any
//   older request, and covers the changes that succeeded before it started. Without a loaded status, its refresh joins
//   the request loading the first status, which may not include it. This is decided when it starts, because a mutation
//   that waits for its refresh succeeds only once that refresh has filled the cache.
export const useRefreshRepoStatusAfterChanges = (owner: string, repoName: string): void => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const queryKey = [QueryKey.RepoStatus, owner, repoName];
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let lastChangeAt = 0;
    const startedWithStatus = new WeakSet<object>();

    const refresh = () => {
      if (queryClient.isFetching({ queryKey }) > 0 || queryClient.isMutating() > 0) {
        timeout = setTimeout(refresh, REFRESH_DELAY_MS);
        return;
      }
      timeout = undefined;
      void queryClient.invalidateQueries({ queryKey });
    };

    const unsubscribe = queryClient.getMutationCache().subscribe((event) => {
      if (event.type !== 'updated') return;
      const { mutation } = event;
      if (event.action.type === 'pending' && queryClient.getQueryData(queryKey) !== undefined) {
        startedWithStatus.add(mutation);
      }
      if (event.action.type !== 'success') return;
      const meta = mutation.options.meta;
      if (meta?.leavesRepoUnchanged === true) return;
      if (meta?.refreshesRepoStatus === true && startedWithStatus.has(mutation)) {
        if (lastChangeAt < mutation.state.submittedAt) {
          clearTimeout(timeout);
          timeout = undefined;
        }
        return;
      }
      lastChangeAt = Date.now();
      clearTimeout(timeout);
      timeout = setTimeout(refresh, REFRESH_DELAY_MS);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [queryClient, owner, repoName]);
};
