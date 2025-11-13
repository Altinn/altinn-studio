import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { DefaultError, UseMutationResult } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import type { UpdateOrgCodeListsPayload } from '../../types/api/UpdateOrgCodeListsPayload';
import { QueryKey } from '../../types/QueryKey';

export function useOrgCodeListsMutation(
  orgName: string,
): UseMutationResult<void, DefaultError, UpdateOrgCodeListsPayload> {
  const { updateOrgCodeLists } = useServicesContext();
  const queryClient = useQueryClient();
  return useMutation<void, DefaultError, UpdateOrgCodeListsPayload>({
    mutationFn: (payload) => updateOrgCodeLists(orgName, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [QueryKey.OrgCodeListsNew, orgName] }),
  });
}
