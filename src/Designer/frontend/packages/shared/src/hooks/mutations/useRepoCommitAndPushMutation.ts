import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ApiError } from 'app-shared/types/api/ApiError';
import { isAxiosError } from 'axios';

const gitNonFastForwardErrorCode = 'GT_01';

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
      hideDefaultError: (error: unknown) =>
        isAxiosError<ApiError>(error) &&
        error.response?.data?.errorCode === gitNonFastForwardErrorCode,
    },
    onSuccess: () => {
      q.invalidateQueries({ queryKey: [QueryKey.RepoStatus, owner, app] }).then();
      q.invalidateQueries({ queryKey: [QueryKey.BranchStatus, owner, app, 'master'] }).then();
    },
  });
};
