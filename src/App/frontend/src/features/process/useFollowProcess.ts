import { useCallback } from 'react';

import { useInstanceDataQuery } from 'src/features/instance/InstanceContext';
import { useOptimisticallyUpdateProcess, useProcessQuery } from 'src/features/instance/useProcessQuery';
import { useNavigateToTask } from 'src/hooks/useNavigatePage';
import { usePollingWithBackoff } from 'src/hooks/usePollingWithBackoff';
import { TaskKeys } from 'src/routesBuilder';

/**
 * Polls the process state with backoff and navigates the user forward when the process moves on
 * (to the next task, or to the receipt when the process ends). This is the mechanism behind every
 * "the app is waiting for the server to advance the process" screen: the Feedback task, and a
 * parked service task (with or without a custom layout).
 */
export function useFollowProcess(enabled = true) {
  const { refetch: reFetchProcessData, data: previousData } = useProcessQuery();
  const navigateToTask = useNavigateToTask();
  const optimisticallyUpdateProcess = useOptimisticallyUpdateProcess();
  const reFetchInstanceData = useInstanceDataQuery({ enabled: false }).refetch;

  const callback = useCallback(async () => {
    const result = await reFetchProcessData();
    if (!result.data) {
      return;
    }

    let navigateTo: undefined | string;
    if (result.data.ended) {
      navigateTo = TaskKeys.ProcessEnd;
    } else if (
      result.data.currentTask?.elementId &&
      result.data.currentTask.elementId !== previousData?.currentTask?.elementId
    ) {
      navigateTo = result.data.currentTask.elementId;
    }

    if (navigateTo) {
      optimisticallyUpdateProcess(result.data);
      await reFetchInstanceData();
      navigateToTask(navigateTo);
    }
  }, [
    navigateToTask,
    optimisticallyUpdateProcess,
    previousData?.currentTask?.elementId,
    reFetchInstanceData,
    reFetchProcessData,
  ]);

  usePollingWithBackoff(callback, enabled);
}
