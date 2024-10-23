import React, { useCallback, useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { createStore } from 'zustand';
import type { QueryClient } from '@tanstack/react-query';

import { ContextNotProvided } from 'src/core/contexts/context';
import { createZustandContext } from 'src/core/contexts/zustandContext';
import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { Loader } from 'src/core/loading/Loader';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { useNavigationParam } from 'src/features/routing/AppRoutingContext';
import { TaskKeys, useNavigatePage } from 'src/hooks/useNavigatePage';
import { fetchProcessState } from 'src/queries/queries';
import { ProcessTaskType } from 'src/types';
import { behavesLikeDataTask } from 'src/utils/formLayout';
import type { QueryDefinition } from 'src/core/queries/usePrefetchQuery';
import type { IProcess } from 'src/types/shared';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

interface IProcessContext {
  data: IProcess | undefined;
  setData: (data: IProcess | undefined) => void;
  reFetch: () => Promise<unknown>;
  setReFetch: (reFetch: () => Promise<unknown>) => void;
}

const { Provider, useSelector, useLaxSelector, useHasProvider } = createZustandContext({
  name: 'Process',
  required: true,
  initialCreateStore: ({ instanceId, queryClient }: { instanceId: string; queryClient: QueryClient }) =>
    createStore<IProcessContext>((set) => ({
      data: undefined,
      setData: (data) => {
        set((state) => {
          if (state.data !== data) {
            queryClient.setQueryData(['fetchProcessState', instanceId], data);
            return { ...state, data };
          }
          return state;
        });
      },
      reFetch: async () => {
        throw new Error('reFetch not implemented yet');
      },
      setReFetch: (reFetch) => set({ reFetch }),
    })),
});

export const useHasProcessProvider = () => useHasProvider();

// Also used for prefetching @see appPrefetcher.ts
export function getProcessQueryDef(instanceId?: string): QueryDefinition<IProcess> {
  return {
    queryKey: ['fetchProcessState', instanceId],
    queryFn: instanceId ? () => fetchProcessState(instanceId) : skipToken,
    enabled: !!instanceId,
  };
}

function useProcessQuery(instanceId: string) {
  const utils = useQuery<IProcess, HttpClientError>(getProcessQueryDef(instanceId));

  useEffect(() => {
    utils.error && window.logError('Fetching process state failed:\n', utils.error);
  }, [utils.error]);

  return utils;
}

export function ProcessProvider({ children, instanceId }: PropsWithChildren<{ instanceId: string }>) {
  const queryClient = useQueryClient();
  return (
    <Provider
      instanceId={instanceId}
      queryClient={queryClient}
    >
      <BlockUntilLoaded instanceId={instanceId}>{children}</BlockUntilLoaded>
    </Provider>
  );
}

function BlockUntilLoaded({ children, instanceId }: PropsWithChildren<{ instanceId: string }>) {
  const taskId = useNavigationParam('taskId');
  const { navigateToTask } = useNavigatePage();
  const query = useProcessQuery(instanceId);
  const setData = useSelector((ctx) => ctx.setData);
  const setReFetch = useSelector((ctx) => ctx.setReFetch);
  const layoutSets = useLayoutSets();
  const isSetToQueryData = useSelector((ctx) => ctx.data === query.data);

  useEffect(() => {
    if (query.data) {
      setData(query.data);
    }

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

  useEffect(() => {
    setReFetch(query.refetch);
  }, [query.refetch, setReFetch]);

  if (query.error) {
    return <DisplayError error={query.error} />;
  }
  if (!query.data || query.isLoading || !isSetToQueryData) {
    return <Loader reason='fetching-process' />;
  }

  return children;
}

function useLaxProcessCtx<U>(selector: (ctx: IProcessContext) => U) {
  const out = useLaxSelector(selector);
  return out === ContextNotProvided ? undefined : out;
}

export const useLaxProcessData = () => useLaxProcessCtx((ctx) => ctx.data);
export const useSetProcessData = () => useLaxProcessCtx((ctx) => ctx.setData);
export const useReFetchProcessData = () => useLaxProcessCtx((ctx) => ctx.reFetch);

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
  return useGetTaskType()(taskId);
}

export function useGetTaskType() {
  const processData = useLaxProcessData();
  const isStateless = useApplicationMetadata().isStatelessApp;
  const layoutSets = useLayoutSets();

  return useCallback(
    (taskId: string | undefined) => {
      const task =
        (processData?.processTasks?.find((t) => t.elementId === taskId) ??
        processData?.currentTask?.elementId === taskId)
          ? processData?.currentTask
          : undefined;

      if (isStateless) {
        // Stateless apps only have data tasks. As soon as they start creating an instance from that stateless step,
        // applicationMetadata.isStatelessApp will return false and we'll proceed as normal.
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
    },
    [isStateless, layoutSets, processData?.currentTask, processData?.ended, processData?.processTasks],
  );
}

export function useRealTaskTypeById(taskId: string | undefined) {
  const isStateless = useApplicationMetadata().isStatelessApp;
  const taskType = useTaskTypeFromBackend();
  const layoutSets = useLayoutSets();

  if (isStateless) {
    // Stateless apps only have data tasks. As soon as they start creating an instance from that stateless step,
    // applicationMetadata.isStatelessApp will return false and we'll proceed as normal.
    return ProcessTaskType.Data;
  }

  const isDataTask = behavesLikeDataTask(taskId, layoutSets);
  return isDataTask ? ProcessTaskType.Data : taskType;
}
