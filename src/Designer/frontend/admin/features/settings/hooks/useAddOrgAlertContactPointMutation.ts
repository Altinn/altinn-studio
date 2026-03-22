import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { OrgAlertContactPointPayload } from 'app-shared/types/OrgAlertContactPoint';

export const useAddOrgAlertContactPointMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { addOrgAlertContactPoint } = useServicesContext();
  return useMutation({
    mutationFn: (payload: OrgAlertContactPointPayload) => addOrgAlertContactPoint(org, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.OrgAlertContactPoints, org] });
    },
  });
};
