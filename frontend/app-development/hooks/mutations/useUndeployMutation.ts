import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

type UseUndeployMutation = {
  environment: string;
};

export const useUndeployMutation = (org: string, app: string) => {
  const { undeployAppFromEnv } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ environment }: UseUndeployMutation) => undeployAppFromEnv(org, app, environment),
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: [QueryKey.AppDeployments, org, app] });
    },
  });
};
