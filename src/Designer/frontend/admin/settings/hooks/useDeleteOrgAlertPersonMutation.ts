import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useDeleteOrgAlertPersonMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { deleteOrgAlertPerson } = useServicesContext();
  return useMutation({
    mutationFn: (id: string) => deleteOrgAlertPerson(org, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.OrgAlertPersons, org] });
    },
  });
};
