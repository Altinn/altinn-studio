import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Repository } from 'app-shared/types/Repository';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useUnsetStarredRepoMutation = () => {
  const { unsetStarredRepo } = useServicesContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (repo: Repository) => unsetStarredRepo(repo.owner.login, repo.name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKey.StarredRepos] }),
  });
};
