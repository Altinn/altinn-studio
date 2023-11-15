import React, { useCallback, useEffect, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/contexts/appQueriesContext';
import { UnknownError } from 'src/features/instantiate/containers/UnknownError';
import { Loader } from 'src/features/loading/Loader';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { DeprecatedActions } from 'src/redux/deprecatedSlice';
import { ProcessTaskType } from 'src/types';
import { useIsStatelessApp } from 'src/utils/appMetadata';
import { createLaxContext } from 'src/utils/createContext';
import { behavesLikeDataTask } from 'src/utils/formLayout';
import type { IInstance, IProcess } from 'src/types/shared';

interface IProcessContext {
  data: IProcess;
  setData: (data: IProcess | ((prevData: IProcess | undefined) => IProcess | undefined)) => void;
  reFetch: () => Promise<void>;
}

const { Provider, useCtx } = createLaxContext<IProcessContext>();

function useProcessQuery(instanceId: string) {
  const { fetchProcessState } = useAppQueries();

  const out = useQuery({
    queryKey: ['fetchProcessState', instanceId],
    queryFn: () => fetchProcessState(instanceId),
    onError: (error) => {
      window.logError('Fetching process state failed:\n', error);
    },
  });

  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(DeprecatedActions.setLastKnownProcess(out.error ? undefined : out.data));
  }, [dispatch, out.data, out.error]);

  return out;
}

export function ProcessProvider({ children, instance }: React.PropsWithChildren<{ instance: IInstance }>) {
  const query = useProcessQuery(instance.id);
  const [data, setData] = useState<IProcess | undefined>(undefined);
  const reFetchNative = query.refetch;
  const reFetch = useCallback(async () => void (await reFetchNative()), [reFetchNative]);
  const dispatch = useAppDispatch();

  useEffect(() => {
    setData(query.data);
  }, [query.data]);

  useEffect(() => {
    dispatch(DeprecatedActions.setLastKnownProcess(data));
  }, [data, dispatch]);

  if (query.error) {
    return <UnknownError />;
  }

  if (!data || query.isLoading) {
    return <Loader reason='fetching-process' />;
  }

  return (
    <Provider
      value={{
        data,
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

export function useRealTaskTypeById(taskId: string | undefined) {
  const isStateless = useIsStatelessApp();
  const taskType = useTaskTypeFromBackend();
  const layoutSets = useAppSelector((state) => state.formLayout.layoutsets);

  if (isStateless) {
    // Stateless apps only have data tasks. As soon as they start creating an instance from that stateless step,
    // useIsStatelessApp() will return false and we'll proceed as normal.
    return ProcessTaskType.Data;
  }

  const isDataTask = behavesLikeDataTask(taskId, layoutSets);
  return isDataTask ? ProcessTaskType.Data : taskType;
}
