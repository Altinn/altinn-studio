import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Mutation to create a new partylist.
 *
 * @param org the organisation of the user
 * @param env the id of the resource
 */
export const useEditResourcePartyListMutation = (org: string, resourceId: string, env: string) => {
  const queryClient = useQueryClient();
  const { editResourcePartyList } = useServicesContext();

  return useMutation({
    mutationFn: (payload: { listId: string; actions: string[] }) =>
      editResourcePartyList(org, resourceId, payload.listId, env, payload.actions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ResourcePartyLists, resourceId, env] });
    },
  });
};
