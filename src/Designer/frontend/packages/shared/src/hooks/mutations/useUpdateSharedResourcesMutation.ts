import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { DefaultError, UseMutationResult } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import type { UpdateSharedResourcesRequest } from '../../types/api/UpdateSharedResourcesRequest';
import { QueryKey } from '../../types/QueryKey';

export function useUpdateSharedResourcesMutation(
  orgName: string,
  path: string,
): UseMutationResult<UpdateSharedResourcesRequest, DefaultError, UpdateSharedResourcesRequest> {
  const { updateSharedResources } = useServicesContext();
  const queryClient = useQueryClient();
  return useMutation<UpdateSharedResourcesRequest, DefaultError, UpdateSharedResourcesRequest>({
    mutationFn: async (payload) => {
      await updateSharedResources(orgName, payload);
      return payload;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [QueryKey.SharedResources, orgName, path] }),
  });
}
