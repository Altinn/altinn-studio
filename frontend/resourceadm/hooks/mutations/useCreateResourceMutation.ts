import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { NewResourceType } from 'resourceadm/types/global';

/**
 * Mutation to create a new resource.
 *
 * @param org the organisation of the user
 */
export const useCreateResourceMutation = (org: string) => {
  const { createResource } = useServicesContext();

  return useMutation({
    mutationFn: (payload: NewResourceType) => createResource(org, payload),
    onSuccess: () => {}
  })
}
