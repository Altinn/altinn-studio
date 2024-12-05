import React, { createContext, useContext, useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { skipToken, useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { Loader } from 'src/core/loading/Loader';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { useNavigationParam } from 'src/features/routing/AppRoutingContext';
import { TaskKeys, useNavigateToTask } from 'src/hooks/useNavigatePage';
import { fetchProcessState } from 'src/queries/queries';
import { isProcessTaskType, ProcessTaskType } from 'src/types';
import { behavesLikeDataTask } from 'src/utils/formLayout';
import type { QueryDefinition } from 'src/core/queries/usePrefetchQuery';
import type { IProcess } from 'src/types/shared';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

// Also used for prefetching @see appPrefetcher.ts
export function getProcessQueryDef(instanceId?: string): QueryDefinition<IProcess> {
  return {
    queryKey: ['fetchProcessState', instanceId],
    queryFn: instanceId ? () => fetchProcessState(instanceId) : skipToken,
    enabled: !!instanceId,
  };
}

const ProcessContext = createContext<Pick<UseQueryResult<IProcess, HttpClientError>, 'data' | 'refetch'> | undefined>(
  undefined,
);

export function ProcessProvider({ children, instanceId }: PropsWithChildren<{ instanceId: string }>) {
  const taskId = useNavigationParam('taskId');
  const layoutSets = useLayoutSets();
  const navigateToTask = useNavigateToTask();

  const { isLoading, data, error, refetch } = useQuery<IProcess, HttpClientError>(getProcessQueryDef(instanceId));

  useEffect(() => {
    const elementId = data?.currentTask?.elementId;
    if (data?.ended) {
      const hasCustomReceipt = behavesLikeDataTask(TaskKeys.CustomReceipt, layoutSets);
      if (hasCustomReceipt) {
        navigateToTask(TaskKeys.CustomReceipt);
      } else {
        navigateToTask(TaskKeys.ProcessEnd);
      }
    } else if (elementId && elementId !== taskId) {
      navigateToTask(elementId, { replace: true, runEffect: taskId !== undefined });
    }
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    error && window.logError('Fetching process state failed:\n', error);
  }, [error]);

  if (isLoading) {
    return <Loader reason='fetching-process' />;
  }

  if (error) {
    return <DisplayError error={error} />;
  }

  return <ProcessContext.Provider value={{ data, refetch }}>{children}</ProcessContext.Provider>;
}

export const useHasProcessProvider = () => useContext(ProcessContext) !== undefined;
export const useLaxProcessData = () => useContext(ProcessContext)?.data;
export const useReFetchProcessData = () => useContext(ProcessContext)?.refetch;

/**
 * This returns the task type of the current process task, as we got it from the backend
 */
export function useTaskTypeFromBackend() {
  const processData = useLaxProcessData();

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
  const processData = useLaxProcessData();
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
