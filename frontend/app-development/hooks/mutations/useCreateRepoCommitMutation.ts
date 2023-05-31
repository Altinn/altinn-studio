import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useCreateRepoCommitMutation = (owner, app) => {
  const q = useQueryClient();
  const { createRepoCommit } = useServicesContext();
  return useMutation({
    mutationFn: ({ commitMessage }: { commitMessage: string }) =>
      createRepoCommit(owner, app, {
        message: commitMessage,
        org: owner,
        repository: app,
      }),
    onSuccess: () => q.invalidateQueries({ queryKey: [QueryKey.RepoPullData, owner, app] }),
  });
};
