import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useDeleteOrgAlertSlackChannelMutation = (org: string) => {
  const queryClient = useQueryClient();
  const { deleteOrgAlertSlackChannel } = useServicesContext();
  return useMutation({
    mutationFn: (id: string) => deleteOrgAlertSlackChannel(org, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.OrgAlertSlackChannels, org] });
    },
  });
};
