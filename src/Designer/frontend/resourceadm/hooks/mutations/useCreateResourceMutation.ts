import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { NewResource } from 'app-shared/types/ResourceAdm';

/**
 * Mutation to create a new resource.
 *
 * @param org the organisation of the user
 */
export const useCreateResourceMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { createResource } = useServicesContext();

  return useMutation({
    mutationFn: (payload: NewResource) => createResource(org, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ResourceList, org] });
    },
  });
};
