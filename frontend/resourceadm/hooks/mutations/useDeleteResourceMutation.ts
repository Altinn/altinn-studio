import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Mutation to delete a resource
 *
 * @param org the organisation of the user
 * @param repo the repo to delete the resource from
 */
export const useDeleteResourceMutation = (org: string, repo: string) => {
  const queryClient = useQueryClient();
  const { deleteResource } = useServicesContext();

  return useMutation({
    mutationFn: (resourceId: string) => deleteResource(org, repo, resourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ResourceList, org] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.RepoStatus, org, repo] });
    },
  });
};
