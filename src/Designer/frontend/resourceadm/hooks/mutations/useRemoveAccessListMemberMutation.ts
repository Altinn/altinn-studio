import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AccessListOrganizationNumbers, HeaderEtag } from 'app-shared/types/ResourceAdm';

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
): UseMutationResult<HeaderEtag> => {
  const queryClient = useQueryClient();
  const { removeAccessListMember } = useServicesContext();

  return useMutation({
    mutationFn: (payload: AccessListOrganizationNumbers) =>
      removeAccessListMember(org, listIdentifier, env, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.AccessListMembers, org, env, listIdentifier],
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKey.AccessList, org, env, listIdentifier],
      });
    },
  });
};
