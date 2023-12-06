import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { PartyList } from 'app-shared/types/ResourceAdm';

/**
 * Mutation to create a new partylist.
 *
 * @param org the organisation of the user
 * @param env the id of the resource
 */
export const useCreatePartyListMutation = (org: string, env: string) => {
  const queryClient = useQueryClient();
  const { createPartyList } = useServicesContext();

  return useMutation({
    mutationFn: (payload: Partial<PartyList>) => createPartyList(org, env, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PartyLists, org, env] });
    },
  });
};
