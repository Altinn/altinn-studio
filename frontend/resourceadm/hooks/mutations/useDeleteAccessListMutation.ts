import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Mutation to delete a access list
 *
 * @param org the organisation of the user
 * @param listIdentifier the identifier of access list to delete
 * @param env the list environment
 */
export const useDeleteAccessListMutation = (org: string, listIdentifier: string, env: string) => {
  const queryClient = useQueryClient();
  const { deleteAccessList } = useServicesContext();

  return useMutation({
    mutationFn: (etag: string) => deleteAccessList(org, listIdentifier, env, etag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.AccessLists, org, env] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.AllAccessLists, org] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.ResourceAccessLists, org, env] });
    },
  });
};
