import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Mutation to remove a access list connection from a resource
 *
 * @param org the organisation of the user
 * @param resourceId the identifier of the resource to remove the list to
 * @param env the list environment
 */
export const useRemoveResourceAccessListMutation = (
  org: string,
  resourceId: string,
  env: string,
) => {
  const queryClient = useQueryClient();
  const { removeResourceAccessList } = useServicesContext();

  return useMutation({
    mutationFn: (listId: string) => removeResourceAccessList(org, resourceId, listId, env),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ResourceAccessLists, env, resourceId] });
    },
  });
};
