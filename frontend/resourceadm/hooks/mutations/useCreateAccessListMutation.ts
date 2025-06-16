import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AccessList } from 'app-shared/types/ResourceAdm';

/**
 * Mutation to create a new access list.
 *
 * @param org the organisation of the user
 * @param env the list environment
 */
export const useCreateAccessListMutation = (org: string, env: string) => {
  const queryClient = useQueryClient();
  const { createAccessList } = useServicesContext();

  return useMutation({
    mutationFn: (payload: Partial<AccessList>) => createAccessList(org, env, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.AccessLists, org, env] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.AllAccessLists, org] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.ResourceAccessLists, org, env] });
    },
  });
};
