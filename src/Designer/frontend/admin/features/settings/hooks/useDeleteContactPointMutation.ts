import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useDeleteContactPointMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { deleteContactPoint } = useServicesContext();
  return useMutation({
    mutationFn: (id: string) => deleteContactPoint(org, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ContactPoints, org] });
    },
  });
};
