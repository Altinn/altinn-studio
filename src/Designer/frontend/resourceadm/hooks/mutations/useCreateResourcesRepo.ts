import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Mutation to create a new resources repository.
 *
 * @param org the organisation of the user
 */
export const useCreateResourcesRepoMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { createResourcesRepo } = useServicesContext();

  return useMutation({
    mutationFn: () => createResourcesRepo(org),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SearchRepos] });
    },
  });
};
