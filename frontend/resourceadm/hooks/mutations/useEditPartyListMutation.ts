import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { PartyList } from 'app-shared/types/ResourceAdm';

/**
 * Mutation to edit an existing resource.
 *
 * @param org the organisation of the user
 * @param listId the repo the user is in
 * @param env the id of the resource
 */
export const useEditPartyListMutation = (org: string, listId: string, env: string) => {
  const queryClient = useQueryClient();
  const { updatePartyList } = useServicesContext();

  return useMutation({
    mutationFn: (payload: Partial<PartyList>) => updatePartyList(org, listId, env, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PartyList, listId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PartyLists, org, env] });
    },
  });
};
