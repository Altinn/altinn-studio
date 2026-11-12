import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { instanceDeletePath } from 'admin/features/apps/utils/apiPaths';
import { del } from 'app-shared/utils/networking';

export const useInstanceDeletionMutation = (
  org: string,
  environment: string,
  app: string,
  instanceId: string,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => await del(instanceDeletePath(org, environment, app, instanceId)),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QueryKey.AppInstanceDetails, org, environment, app, instanceId],
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKey.AppInstances, org, environment, app],
      });
    },
  });
};
