import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { ResourceBackendType } from 'resourceadm/types/global';

/**
 * Mutation to edit an existing resource.
 *
 * @param org the organisation of the user
 * @param repo the repo the user is in
 * @param id the id of the resource
 */
export const useEditResourceMutation = (org: string, repo: string, id: string) => {
  const queryClient = useQueryClient();
  const { updateResource } = useServicesContext();

  return useMutation({
    mutationFn: (payload: ResourceBackendType) => updateResource(org, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ResourceList, org] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SingleResource, org, repo, id] });
    }
  })
}
