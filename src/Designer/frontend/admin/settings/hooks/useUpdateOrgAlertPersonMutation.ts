import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { OrgAlertPersonPayload } from 'app-shared/types/OrgAlertContactPoint';

export const useUpdateOrgAlertPersonMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { updateOrgAlertPerson } = useServicesContext();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: OrgAlertPersonPayload }) =>
      updateOrgAlertPerson(org, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.OrgAlertPersons, org] });
    },
  });
};
