import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

type UseUndeployMutation = {
  environment: string;
};

export const useUndeployMutation = (org: string, app: string) => {
  const { undeployAppFromEnv } = useServicesContext();

  return useMutation({
    mutationFn: ({ environment }: UseUndeployMutation) => undeployAppFromEnv(org, app, environment),
    onSuccess: (): void => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.AppDeployments, org, app] });
    },
  });
};
