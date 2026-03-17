import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { OrgAlertSlackChannelPayload } from 'app-shared/types/OrgAlertContactPoint';

export const useAddOrgAlertSlackChannelMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { addOrgAlertSlackChannel } = useServicesContext();
  return useMutation({
    mutationFn: (payload: OrgAlertSlackChannelPayload) => addOrgAlertSlackChannel(org, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.OrgAlertSlackChannels, org] });
    },
  });
};
