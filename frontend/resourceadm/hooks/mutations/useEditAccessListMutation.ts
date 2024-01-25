import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { JsonPatch } from 'app-shared/types/ResourceAdm';

/**
 * Mutation to edit metadata of a access list
 *
 * @param org the organisation of the user
 * @param listIdentifier the identifier of access list to delete
 * @param env the list environment
 */
export const useEditAccessListMutation = (org: string, listIdentifier: string, env: string) => {
  const queryClient = useQueryClient();
  const { updateAccessList } = useServicesContext();

  return useMutation({
    mutationFn: (payload: JsonPatch[]) => updateAccessList(org, listIdentifier, env, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.AccessList, listIdentifier, env] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.AccessLists, env] });
    },
  });
};
