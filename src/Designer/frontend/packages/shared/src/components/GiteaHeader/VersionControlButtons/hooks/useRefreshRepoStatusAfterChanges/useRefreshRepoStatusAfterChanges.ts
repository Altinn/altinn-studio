import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';

export const REFRESH_DELAY_MS = 1000;

// Studio saves every change to the user's copy of the repository, so any change can change what there is to share.
// The status request fetches from Gitea, and some saves wait for it. So it waits for a pause in the saves, and for a
// request that is still running. Mutations that refresh the status themselves set meta.refreshesRepoStatus, and are
// left to it.
export const useRefreshRepoStatusAfterChanges = (owner: string, repoName: string): void => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const queryKey = [QueryKey.RepoStatus, owner, repoName];
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const refresh = () => {
      if (queryClient.isFetching({ queryKey }) > 0) {
        timeout = setTimeout(refresh, REFRESH_DELAY_MS);
        return;
      }
      void queryClient.invalidateQueries({ queryKey });
    };

    const unsubscribe = queryClient.getMutationCache().subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'success') return;
      if (event.mutation.options.meta?.refreshesRepoStatus) return;
      clearTimeout(timeout);
      timeout = setTimeout(refresh, REFRESH_DELAY_MS);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [queryClient, owner, repoName]);
};
