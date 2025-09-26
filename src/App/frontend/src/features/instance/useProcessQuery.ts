import { useEffect } from 'react';

import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useNavigationParam } from 'src/hooks/navigation';
import { TaskKeys, useNavigateToTask } from 'src/hooks/useNavigatePage';
import { fetchProcessState } from 'src/queries/queries';
import { isProcessTaskType, ProcessTaskType } from 'src/types';
import { behavesLikeDataTask } from 'src/utils/formLayout';
import type { LooseAutocomplete } from 'src/types';
import type { IActionType, IProcess } from 'src/types/shared';

export const processQueries = {
  all: () => ['process'],
  processStateKey: (instanceId?: string) => [...processQueries.all(), instanceId],
  processState: (instanceId?: string) =>
    queryOptions({
      queryKey: processQueries.processStateKey(instanceId),
      queryFn: instanceId ? () => fetchProcessState(instanceId) : skipToken,
    }),
} as const;

export function useProcessQuery() {
  const instanceId = useLaxInstanceId();
  const taskId = useNavigationParam('taskId');
  const layoutSets = useLayoutSets();
  const navigateToTask = useNavigateToTask();

  // debugger

  const query = useQuery(processQueries.processState(instanceId));

  const { data, error } = query;
  const ended = !!data?.ended;

  // TODO: move this to a layout file on task id change instead
  useEffect(() => {
    if (ended) {
      // Catch cases where there is a custom receipt, but we've navigated
      // to the wrong one (i.e. mocking in all-process-steps.ts)
      const hasCustomReceipt = behavesLikeDataTask(TaskKeys.CustomReceipt, layoutSets);
      if (taskId === TaskKeys.ProcessEnd && hasCustomReceipt) {
        navigateToTask(TaskKeys.CustomReceipt);
      } else if (taskId === TaskKeys.CustomReceipt && !hasCustomReceipt) {
        navigateToTask(TaskKeys.ProcessEnd);
      }
    }
  }, [ended, layoutSets, navigateToTask, taskId]);

  useEffect(() => {
    error && window.logError('Fetching process state failed:\n', error);
  }, [error]);

  return query;
}

export const useIsAuthorized = () => {
  const { data } = useProcessQuery();

  return (action: LooseAutocomplete<IActionType>): boolean => {
    const userAction = data?.currentTask?.userActions?.find((a) => a.id === action);
    return !!userAction?.authorized;
  };
};

/**
 * This returns the task type of the current process task, as we got it from the backend
 */
export function useTaskTypeFromBackend() {
  const { data: processData } = useProcessQuery();

  if (processData?.ended) {
    return ProcessTaskType.Archived;
  }

  const altinnTaskType = processData?.currentTask?.altinnTaskType;
  if (altinnTaskType && isProcessTaskType(altinnTaskType)) {
    return altinnTaskType;
  }

  return ProcessTaskType.Unknown;
}

/**
 * This hook returns the taskType of a given taskId. If the
 * taskId cannot be found in processTasks it will return the
 * taskType of the currentTask if the currentTask matches
 * the taskId provided.
 */
export function useGetTaskTypeById() {
  const { data: processData } = useProcessQuery();
  const isStateless = useApplicationMetadata().isStatelessApp;
  const layoutSets = useLayoutSets();

  return (taskId: string | undefined) => {
    const task =
      (processData?.processTasks?.find((t) => t.elementId === taskId) ?? processData?.currentTask?.elementId === taskId)
        ? processData?.currentTask
        : undefined;

    if (isStateless || taskId === TaskKeys.CustomReceipt || behavesLikeDataTask(taskId, layoutSets)) {
      // Stateless apps only have data tasks. As soon as they start creating an instance from that stateless step,
      // applicationMetadata.isStatelessApp will return false and we'll proceed as normal.
      return ProcessTaskType.Data;
    }

    if (taskId === TaskKeys.ProcessEnd || processData?.ended) {
      return ProcessTaskType.Archived;
    }

    const altinnTaskType = task?.altinnTaskType;
    if (altinnTaskType && isProcessTaskType(altinnTaskType)) {
      return altinnTaskType;
    }

    return ProcessTaskType.Unknown;
  };
}

/**
 * Returns the actual raw task type of a given taskId.
 */
export function useGetAltinnTaskType() {
  const { data: processData } = useProcessQuery();
  return (taskId: string | undefined) => processData?.processTasks?.find((t) => t.elementId === taskId)?.altinnTaskType;
}

export function useOptimisticallyUpdateProcess() {
  const queryClient = useQueryClient();
  const instanceId = useLaxInstanceId();

  const processQueryKey = processQueries.processStateKey(instanceId);

  return (process: IProcess) => queryClient.setQueryData<IProcess>(processQueryKey, process);
}
