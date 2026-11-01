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

// A refetch can have left the environment out, such as when its gateway did not answer, so the restart adds it back.
const replaceRunningApp = (
  deployments: DeploymentsResponse,
  restarted: RunningApp,
): DeploymentsResponse => {
  const runningAppList = deployments.runningAppList ?? [];
  const isListed = runningAppList.some(
    (runningApp) => runningApp.environment === restarted.environment,
  );
  return {
    ...deployments,
    runningAppList: isListed
      ? runningAppList.map((runningApp) =>
          runningApp.environment === restarted.environment ? restarted : runningApp,
        )
      : [...runningAppList, restarted],
  };
};
