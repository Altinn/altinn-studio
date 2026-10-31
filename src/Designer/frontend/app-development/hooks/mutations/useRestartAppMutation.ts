import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { DeploymentsResponse } from 'app-shared/types/api/DeploymentsResponse';
import type { RunningApp } from 'app-shared/types/api/RunningApp';

type UseRestartAppMutation = {
  environment: string;
};

export const useRestartAppMutation = (org: string, app: string) => {
  const { restartApp } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ environment }: UseRestartAppMutation) => restartApp(org, app, environment),
    onSuccess: async (restarted: RunningApp): Promise<void> => {
      // The app is updating from now on, which starts the polling in useAppDeploymentsQuery.
      queryClient.setQueryData<DeploymentsResponse>(
        [QueryKey.AppDeployments, org, app],
        (deployments) => deployments && replaceRunningApp(deployments, restarted),
      );
      await queryClient.invalidateQueries({ queryKey: [QueryKey.AppDeployments, org, app] });
    },
  });
};

const replaceRunningApp = (
  deployments: DeploymentsResponse,
  restarted: RunningApp,
): DeploymentsResponse => ({
  ...deployments,
  runningAppList: (deployments.runningAppList ?? []).map((runningApp) =>
    runningApp.environment === restarted.environment ? restarted : runningApp,
  ),
});
