import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { OrgAlertSlackChannelPayload } from 'app-shared/types/OrgAlertContactPoint';

export const useUpdateOrgAlertSlackChannelMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { updateOrgAlertSlackChannel } = useServicesContext();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: OrgAlertSlackChannelPayload }) =>
      updateOrgAlertSlackChannel(org, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.OrgAlertSlackChannels, org] });
    },
  });
};
