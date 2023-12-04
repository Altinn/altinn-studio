import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { IRepository } from 'app-shared/types/global';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useUnsetStarredRepoMutation = () => {
  const { unsetStarredRepo } = useServicesContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (repo: IRepository) => unsetStarredRepo(repo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKey.StarredRepos] }),
  });
};
