import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { OrgAlertContactPointPayload } from 'app-shared/types/OrgAlertContactPoint';

export const useUpdateOrgAlertContactPointMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { updateOrgAlertContactPoint } = useServicesContext();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: OrgAlertContactPointPayload }) =>
      updateOrgAlertContactPoint(org, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.OrgAlertContactPoints, org] });
    },
  });
};
