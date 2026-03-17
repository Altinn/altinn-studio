import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { OrgAlertPersonPayload } from 'app-shared/types/OrgAlertContactPoint';

export const useAddOrgAlertPersonMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { addOrgAlertPerson } = useServicesContext();
  return useMutation({
    mutationFn: (payload: OrgAlertPersonPayload) => addOrgAlertPerson(org, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.OrgAlertPersons, org] });
    },
  });
};
