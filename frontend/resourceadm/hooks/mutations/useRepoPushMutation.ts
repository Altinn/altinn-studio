import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useRepoPushMutation = (owner, app) => {
  const q = useQueryClient();
  const { pushRepoChanges } = useServicesContext();
  return useMutation({
    mutationFn: () => pushRepoChanges(owner, app),
    onSuccess: () => {
      q.invalidateQueries({ queryKey: [QueryKey.RepoStatus, owner, app] }).then();
      q.invalidateQueries({ queryKey: [QueryKey.BranchStatus, owner, app, 'master'] }).then();
    },
  });
};
