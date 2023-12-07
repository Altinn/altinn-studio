import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Mutation to create a new partylist.
 *
 * @param org the organisation of the user
 * @param env the id of the resource
 */
export const useAddPartyListMemberMutation = (org: string, listId: string, env: string) => {
  const queryClient = useQueryClient();
  const { addPartyListMember } = useServicesContext();

  return useMutation({
    mutationFn: (orgnr: string) => addPartyListMember(org, listId, orgnr, env),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PartyList, listId, env] });
    },
  });
};
