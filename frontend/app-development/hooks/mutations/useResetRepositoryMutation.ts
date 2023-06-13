import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useResetRepositoryMutation = (owner, app) => {
  const q = useQueryClient();
  const { resetRepoChanges } = useServicesContext();
  return useMutation({
    mutationFn: () => resetRepoChanges(owner, app),
    onSuccess: () => {
      q.invalidateQueries({ queryKey: [QueryKey.RepoStatus, owner, app] }).then();
      q.invalidateQueries({ queryKey: [QueryKey.BranchStatus, owner, app, 'master'] }).then();
      q.invalidateQueries({ queryKey: [QueryKey.FormLayouts, owner, app] }).then();
      q.invalidateQueries({ queryKey: [QueryKey.FormLayoutSettings, owner, app] }).then();
      q.invalidateQueries({ queryKey: [QueryKey.TextResources, owner, app] }).then();
      q.invalidateQueries({ queryKey: [QueryKey.Datamodel, owner, app] }).then();
    },
  });
};
