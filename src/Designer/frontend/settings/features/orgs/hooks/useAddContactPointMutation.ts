import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ContactPointPayload } from 'app-shared/types/ContactPoint';

export const useAddContactPointMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { addContactPoint } = useServicesContext();
  return useMutation({
    mutationFn: (payload: ContactPointPayload) => addContactPoint(org, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ContactPoints, org] });
    },
  });
};
