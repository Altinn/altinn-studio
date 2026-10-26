import { useCallback, useEffect, useRef } from 'react';

import { useInstanceDataQuery } from 'src/features/instance/InstanceContext';
import { getTargetTaskFromProcess } from 'src/features/instance/useProcessNext';
import { useOptimisticallyUpdateProcess, useProcessQuery } from 'src/features/instance/useProcessQuery';
import { useNavigationParam } from 'src/hooks/navigation';
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

  const taskId = useNavigationParam('taskId');
  const followedTask = useRef<string | undefined>(undefined);
  const targetTask = getTargetTaskFromProcess(previousData);

  useEffect(() => {
    if (enabled && targetTask === taskId) {
      followedTask.current = taskId;
      return;
    }

    // Another reader can advance the cache before our poll. Follow tasks observed as current
    // in this session, while preserving manual recovery for an initially stale URL.
    const wasFollowingTask = followedTask.current !== undefined && followedTask.current === taskId;
    followedTask.current = undefined;
    if (wasFollowingTask && targetTask && targetTask !== taskId) {
      navigateToTask(targetTask);
    }
  }, [enabled, navigateToTask, targetTask, taskId]);

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
