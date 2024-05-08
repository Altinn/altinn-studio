import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Mutation to remove a member from a access list
 *
 * @param org the organisation of the user
 * @param listIdentifier the identifier of access list to remove member from
 * @param env the list environment
 */
export const useRemoveAccessListMemberMutation = (
  org: string,
  listIdentifier: string,
  env: string,
) => {
  const queryClient = useQueryClient();
  const { removeAccessListMember } = useServicesContext();

  return useMutation({
    mutationFn: (orgnrs: string[]) =>
      removeAccessListMember(org, listIdentifier, env, { data: orgnrs }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.AccessList, env, listIdentifier] });
    },
  });
};
