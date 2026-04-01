import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ContactPointPayload } from 'app-shared/types/ContactPoint';

export const useUpdateContactPointMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { updateContactPoint } = useServicesContext();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ContactPointPayload }) =>
      updateContactPoint(org, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ContactPoints, org] });
    },
  });
};
