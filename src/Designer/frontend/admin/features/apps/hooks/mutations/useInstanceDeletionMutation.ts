import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export const useInstanceDeletionMutation = (
  org: string,
  environment: string,
  app: string,
  instanceId: string,
) => {
  const queryClient = useQueryClient();
  const { deleteAppInstance } = useServicesContext();
  return useMutation({
    mutationFn: () => deleteAppInstance(org, environment, app, instanceId),
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
