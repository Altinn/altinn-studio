import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Mutation to add a member to a party list.
 *
 * @param org the organisation of the user
 * @param listIdentifier the identifier of the list to add the member to
 * @param env the list environment
 */
export const useAddPartyListMemberMutation = (org: string, listIdentifier: string, env: string) => {
  const queryClient = useQueryClient();
  const { addPartyListMember } = useServicesContext();

  return useMutation({
    mutationFn: (orgnr: string) => addPartyListMember(org, listIdentifier, orgnr, env),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PartyList, listIdentifier, env] });
    },
  });
};
