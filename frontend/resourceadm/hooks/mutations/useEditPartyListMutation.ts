import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { JsonPatch } from 'resourceadm/pages/OrganizationAccessPage/jsonPatchUtils';

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
    mutationFn: (payload: JsonPatch[]) => updatePartyList(org, listId, env, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PartyList, listId, env] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PartyLists, env] });
    },
  });
};
