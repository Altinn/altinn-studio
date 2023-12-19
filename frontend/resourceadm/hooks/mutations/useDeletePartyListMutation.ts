import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Mutation to delete a party list
 *
 * @param org the organisation of the user
 * @param listIdentifier the identifier of party list to delete
 * @param env the list environment
 */
export const useDeletePartyListMutation = (org: string, listIdentifier: string, env: string) => {
  const queryClient = useQueryClient();
  const { deletePartyList } = useServicesContext();

  return useMutation({
    mutationFn: () => deletePartyList(org, listIdentifier, env),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PartyLists, env] });
    },
  });
};
