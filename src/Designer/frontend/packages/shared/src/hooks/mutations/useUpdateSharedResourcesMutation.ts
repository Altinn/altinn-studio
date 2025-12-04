import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { DefaultError, UseMutationResult } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import type { UpdateSharedResourcesRequest } from '../../types/api/UpdateSharedResourcesRequest';
import { QueryKey } from '../../types/QueryKey';

export function useUpdateSharedResourcesMutation(
  orgName: string,
): UseMutationResult<void, DefaultError, UpdateSharedResourcesRequest> {
  const { updateSharedResources } = useServicesContext();
  const queryClient = useQueryClient();
  return useMutation<void, DefaultError, UpdateSharedResourcesRequest>({
    mutationFn: (payload) => updateSharedResources(orgName, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [QueryKey.SharedResourcesByPath, orgName] }),
  });
}
