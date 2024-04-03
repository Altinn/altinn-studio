import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Mutation to connect a access list to a resource
 *
 * @param org the organisation of the user
 * @param resourceId the identifier of the resource to connect the list to
 * @param env the list environment
 */
export const useAddResourceAccessListMutation = (org: string, resourceId: string, env: string) => {
  const queryClient = useQueryClient();
  const { addResourceAccessList } = useServicesContext();

  return useMutation({
    mutationFn: (listId: string) => addResourceAccessList(org, resourceId, listId, env),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ResourceAccessLists, env, resourceId] });
    },
  });
};
