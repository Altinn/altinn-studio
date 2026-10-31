import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { RepoStatus } from 'app-shared/types/RepoStatus';
import { hasChangesToShare } from '../../utils/repoStatus';

export const REFRESH_DELAY_MS = 1000;

// Studio saves every change to the user's copy of the repository, so any change can give the user something to share.
// The status request fetches from Gitea while it holds the lock that saves wait for. So it waits for a pause in the
// saves, and stops once there is something to share, which later changes rarely undo.
export const useRefreshRepoStatusAfterChanges = (owner: string, repoName: string): void => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const queryKey = [QueryKey.RepoStatus, owner, repoName];
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const unsubscribe = queryClient.getMutationCache().subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'success') return;
      const repoStatus = queryClient.getQueryData<RepoStatus>(queryKey);
      if (repoStatus && hasChangesToShare(repoStatus)) return;

      clearTimeout(timeout);
      timeout = setTimeout(
        () => void queryClient.invalidateQueries({ queryKey }),
        REFRESH_DELAY_MS,
      );
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [queryClient, owner, repoName]);
};
