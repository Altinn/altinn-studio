import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { ResourceBackendType } from 'resourceadm/types/global';

export const useEditResourceMutation = (org: string, id: string) => {
  const queryClient = useQueryClient();
  const { updateResource } = useServicesContext();

  return useMutation({
    mutationFn: (payload: ResourceBackendType) => updateResource(org, id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKey.EditResource, org, id] })
  })
}
