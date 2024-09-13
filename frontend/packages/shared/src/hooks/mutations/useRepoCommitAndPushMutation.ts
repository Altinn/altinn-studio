import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useRepoCommitAndPushMutation = (owner: string, app: string) => {
  const q = useQueryClient();
  const { commitAndPushChanges } = useServicesContext();

  const invalidateQueries = () => {
    q.invalidateQueries({ queryKey: [QueryKey.RepoStatus, owner, app] });
    q.invalidateQueries({ queryKey: [QueryKey.BranchStatus, owner, app, 'master'] });
  };

  const hasMergeConflict = (serverCode: ServerCodes) => serverCode === ServerCodes.Conflict;

  return useMutation({
    mutationFn: ({ commitMessage }: { commitMessage: string }) =>
      commitAndPushChanges(owner, app, {
        message: commitMessage,
        org: owner,
        repository: app,
      }),
    onSuccess: () => invalidateQueries(),
    onError: (error) => {
      if (hasMergeConflict(error?.response?.status)) {
        invalidateQueries();
      }
    },
    meta: {
      hideDefaultError: (error) => hasMergeConflict(error?.response?.status),
    },
  });
};
