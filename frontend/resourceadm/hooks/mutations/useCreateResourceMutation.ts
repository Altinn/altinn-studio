import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { NewResourceType } from 'resourceadm/types/global';

export const useCreateResourceMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { createResource } = useServicesContext();

  return useMutation({
    mutationFn: (payload: NewResourceType) => createResource(org, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKey.CreateResource, org] })
  })
}
