import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useToggleContactPointActiveMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { toggleContactPointActive } = useServicesContext();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleContactPointActive(org, id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ContactPoints, org] });
    },
  });
};
