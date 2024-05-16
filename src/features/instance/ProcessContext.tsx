import React, { useCallback, useEffect } from 'react';

import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { createContext } from 'src/core/contexts/context';
import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { Loader } from 'src/core/loading/Loader';
import { useLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { TaskKeys, useNavigatePage } from 'src/hooks/useNavigatePage';
import { ProcessTaskType } from 'src/types';
import { behavesLikeDataTask } from 'src/utils/formLayout';
import { useIsStatelessApp } from 'src/utils/useIsStatelessApp';
import type { QueryDefinition } from 'src/core/queries/usePrefetchQuery';
import type { IInstance, IProcess } from 'src/types/shared';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

interface IProcessContext {
  data: IProcess;
  setData: (data: IProcess | undefined) => void;
  reFetch: () => Promise<void>;
}

const { Provider, useCtx, useHasProvider } = createContext<IProcessContext | undefined>({
  name: 'Process',
  required: false,
  default: undefined,
});

export const useHasProcessProvider = () => useHasProvider();

// Also used for prefetching @see appPrefetcher.ts
export function useProcessQueryDef(instanceId?: string): QueryDefinition<IProcess> {
  const { fetchProcessState } = useAppQueries();
  return {
    queryKey: ['fetchProcessState', instanceId],
    queryFn: instanceId ? () => fetchProcessState(instanceId) : skipToken,
    enabled: !!instanceId,
  };
}

function useProcessQuery(instanceId: string) {
  const utils = useQuery<IProcess, HttpClientError>(useProcessQueryDef(instanceId));

  useEffect(() => {
    utils.error && window.logError('Fetching process state failed:\n', utils.error);
  }, [utils.error]);

  return utils;
}

export function ProcessProvider({ children, instance }: React.PropsWithChildren<{ instance: IInstance }>) {
  const { navigateToTask, taskId } = useNavigatePage();
  const query = useProcessQuery(instance.id);
  const reFetchNative = query.refetch;
  const reFetch = useCallback(async () => void (await reFetchNative()), [reFetchNative]);
  const queryClient = useQueryClient();
  const instanceId = useLaxInstanceData()?.id;
  const layoutSets = useLayoutSets();

  const setData = useCallback(
    (data: IProcess | undefined) => queryClient.setQueryData(['fetchProcessState', instanceId], data),
    [queryClient, instanceId],
  );

  useEffect(() => {
    const elementId = query?.data?.currentTask?.elementId;
    if (query?.data?.ended) {
      const hasCustomReceipt = behavesLikeDataTask(TaskKeys.CustomReceipt, layoutSets);
      if (hasCustomReceipt) {
        navigateToTask(TaskKeys.CustomReceipt);
      } else {
        navigateToTask(TaskKeys.ProcessEnd);
      }
    } else if (elementId && elementId !== taskId) {
      navigateToTask(elementId, { replace: true, runEffect: taskId !== undefined });
    }
    /**
     * We only want to run this effect when the query data changes.
     */
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  if (query.error) {
    return <DisplayError error={query.error} />;
  }
  if (!query.data || query.isLoading) {
    return <Loader reason='fetching-process' />;
  }

  return (
    <Provider
      value={{
        data: query.data,
        setData,
        reFetch,
      }}
    >
      {children}
    </Provider>
  );
}

export const useLaxProcessData = () => useCtx()?.data;
export const useSetProcessData = () => useCtx()?.setData;
export const useReFetchProcessData = () => useCtx()?.reFetch;

/**
 * This returns the task type of the current process task, as we got it from the backend
 *
 * @see useRealTaskType
 */
export function useTaskTypeFromBackend() {
  const processData = useLaxProcessData();

  if (processData?.ended) {
    return ProcessTaskType.Archived;
  }

  if (processData?.currentTask?.altinnTaskType) {
    return processData.currentTask.altinnTaskType as ProcessTaskType;
  }

  return ProcessTaskType.Unknown;
}

/**
 * This returns the task type of the current process task, as we want to use it in the frontend. Some tasks
 * are configured to behave like data tasks, and we want to treat them as such.
 *
 * @see useTaskTypeFromBackend
 */
export function useRealTaskType() {
  const taskId = useLaxProcessData()?.currentTask?.elementId;
  return useRealTaskTypeById(taskId || undefined);
}

/**
 * This hook returns the taskType of a given taskId. If the
 * taskId cannot be found in processTasks it will return the
 * taskType of the currentTask if the currentTask matches
 * the taskId provided.
 */
export function useTaskType(taskId: string | undefined) {
  const processData = useLaxProcessData();
  const task =
    processData?.processTasks?.find((t) => t.elementId === taskId) ?? processData?.currentTask?.elementId === taskId
      ? processData?.currentTask
      : undefined;
  const isStateless = useIsStatelessApp();
  const layoutSets = useLayoutSets();

  if (isStateless) {
    // Stateless apps only have data tasks. As soon as they start creating an instance from that stateless step,
    // useIsStatelessApp() will return false and we'll proceed as normal.
    return ProcessTaskType.Data;
  }

  if (taskId === TaskKeys.CustomReceipt) {
    return ProcessTaskType.Data;
  }

  if (taskId === TaskKeys.ProcessEnd) {
    return ProcessTaskType.Archived;
  }

  if (processData?.ended) {
    return ProcessTaskType.Archived;
  }
  if (task === undefined || task?.altinnTaskType === undefined) {
    return ProcessTaskType.Unknown;
  }

  const isDataTask = behavesLikeDataTask(task.elementId, layoutSets);
  return isDataTask ? ProcessTaskType.Data : (task.altinnTaskType as ProcessTaskType);
}

export function useRealTaskTypeById(taskId: string | undefined) {
  const isStateless = useIsStatelessApp();
  const taskType = useTaskTypeFromBackend();
  const layoutSets = useLayoutSets();

  if (isStateless) {
    // Stateless apps only have data tasks. As soon as they start creating an instance from that stateless step,
    // useIsStatelessApp() will return false and we'll proceed as normal.
    return ProcessTaskType.Data;
  }

  const isDataTask = behavesLikeDataTask(taskId, layoutSets);
  return isDataTask ? ProcessTaskType.Data : taskType;
}
