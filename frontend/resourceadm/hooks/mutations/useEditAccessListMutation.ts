import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AccessList, ResourceError } from 'app-shared/types/ResourceAdm';

/**
 * Mutation to edit metadata of a access list
 *
 * @param org the organisation of the user
 * @param listIdentifier the identifier of access list to delete
 * @param env the list environment
 */
export const useEditAccessListMutation = (
  org: string,
  listIdentifier: string,
  env: string,
): UseMutationResult<AccessList, ResourceError> => {
  const queryClient = useQueryClient();
  const { updateAccessList } = useServicesContext();

  return useMutation({
    mutationFn: (payload: AccessList) => updateAccessList(org, listIdentifier, env, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ResourceAccessLists, org, env] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.AccessList, org, env, listIdentifier] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.AccessLists, org, env] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.AllAccessLists, org] });
    },
  });
};
