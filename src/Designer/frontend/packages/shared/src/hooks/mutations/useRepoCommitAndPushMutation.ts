import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { isGitNonFastForwardError } from 'app-shared/utils/ApiErrorUtils';

export const useRepoCommitAndPushMutation = (owner: string, app: string) => {
  const q = useQueryClient();
  const { commitAndPushChanges } = useServicesContext();
  return useMutation({
    mutationFn: ({ commitMessage }: { commitMessage: string }) =>
      commitAndPushChanges(owner, app, {
        message: commitMessage,
        org: owner,
        repository: app,
      }),
    meta: {
      // The caller explains this error, usually with the merge conflict screen.
      hideDefaultError: isGitNonFastForwardError,
      refreshesRepoStatus: true,
    },
    onSuccess: () => {
      q.invalidateQueries({ queryKey: [QueryKey.RepoStatus, owner, app] }).then();
      q.invalidateQueries({ queryKey: [QueryKey.BranchStatus, owner, app] }).then();
    },
  });
};
