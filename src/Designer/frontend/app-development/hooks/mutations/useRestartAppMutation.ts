import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { environmentsOf, type DeploymentsResponse } from 'app-shared/types/api/DeploymentsResponse';
import type { AppInEnvironment, RunningApp } from 'app-shared/types/api/RunningApp';

type UseRestartAppMutation = {
  environment: string;
};

export const useRestartAppMutation = (org: string, app: string) => {
  const { restartApp } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ environment }: UseRestartAppMutation) => restartApp(org, app, environment),
    onSuccess: (restarted: RunningApp): void => {
      // The app is updating from now on, which starts the polling in useAppDeploymentsQuery.
      queryClient.setQueryData<DeploymentsResponse>(
        [QueryKey.AppDeployments, org, app],
        (deployments) => deployments && replaceRunningApp(deployments, restarted),
      );
    },
    // A refusal means the page no longer shows what runs, such as when someone else restarted the app since.
    onSettled: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: [QueryKey.AppDeployments, org, app] });
    },
  });
};

// A refetch can have found the environment unknown, such as when its gateway did not answer, which the restart settles.
const replaceRunningApp = (
  deployments: DeploymentsResponse,
  restarted: RunningApp,
): DeploymentsResponse => {
  const restartedEnvironment: AppInEnvironment = {
    environment: restarted.environment,
    state: 'running',
    runningApp: restarted,
  };
  const environmentList = environmentsOf(deployments);
  const isListed = environmentList.some(
    (environment) => environment.environment === restarted.environment,
  );
  return {
    ...deployments,
    environmentList: isListed
      ? environmentList.map((environment) =>
          environment.environment === restarted.environment ? restartedEnvironment : environment,
        )
      : [...environmentList, restartedEnvironment],
  };
};
