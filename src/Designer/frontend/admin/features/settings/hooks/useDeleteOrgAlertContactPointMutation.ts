import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useDeleteOrgAlertContactPointMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { deleteOrgAlertContactPoint } = useServicesContext();
  return useMutation({
    mutationFn: (id: string) => deleteOrgAlertContactPoint(org, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.OrgAlertContactPoints, org] });
    },
  });
};
