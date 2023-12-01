import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { IRepository } from 'app-shared/types/global';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useSetStarredRepoMutation = () => {
  const { setStarredRepo } = useServicesContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (repo: IRepository) => setStarredRepo(repo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKey.StarredRepos] }),
  });
};
