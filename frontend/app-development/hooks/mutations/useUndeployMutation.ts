import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

type UseUndeployMutation = {
  environment: string;
};

export const useUndeployMutation = (org: string, app: string) => {
  const { undeployAppFromEnv } = useServicesContext();

  return useMutation({
    mutationFn: ({ environment }: UseUndeployMutation) => undeployAppFromEnv(org, app, environment),
  });
};
