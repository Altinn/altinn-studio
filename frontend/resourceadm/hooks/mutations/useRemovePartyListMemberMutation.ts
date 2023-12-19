import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Mutation to remove a member from a party list
 *
 * @param org the organisation of the user
 * @param listIdentifier the identifier of party list to remove member from
 * @param env the list environment
 */
export const useRemovePartyListMemberMutation = (
  org: string,
  listIdentifier: string,
  env: string,
) => {
  const queryClient = useQueryClient();
  const { removePartyListMember } = useServicesContext();

  return useMutation({
    mutationFn: (orgnr: string) => removePartyListMember(org, listIdentifier, orgnr, env),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PartyList, listIdentifier, env] });
    },
  });
};
