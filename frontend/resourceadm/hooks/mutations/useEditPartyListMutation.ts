import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { JsonPatch } from 'resourceadm/utils/jsonPatchUtils/jsonPatchUtils';

/**
 * Mutation to edit metadata of a party list
 *
 * @param org the organisation of the user
 * @param listIdentifier the identifier of party list to delete
 * @param env the list environment
 */
export const useEditPartyListMutation = (org: string, listIdentifier: string, env: string) => {
  const queryClient = useQueryClient();
  const { updatePartyList } = useServicesContext();

  return useMutation({
    mutationFn: (payload: JsonPatch[]) => updatePartyList(org, listIdentifier, env, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PartyList, listIdentifier, env] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PartyLists, env] });
    },
  });
};
