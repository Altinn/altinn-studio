import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';

// Studio saves every change to the user's copy of the repository, so any change can give the user something to share.
export const useRefreshRepoStatusAfterChanges = (owner: string, repoName: string): void => {
  const queryClient = useQueryClient();

  useEffect(
    () =>
      queryClient.getMutationCache().subscribe((event) => {
        if (event.type === 'updated' && event.action.type === 'success') {
          void queryClient.invalidateQueries({ queryKey: [QueryKey.RepoStatus, owner, repoName] });
        }
      }),
    [queryClient, owner, repoName],
  );
};
