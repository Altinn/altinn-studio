import React from 'react';
import { useNavigation } from 'react-router-dom';
import type { PropsWithChildren } from 'react';

import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import deepEqual from 'fast-deep-equal';
import type { UseQueryOptions } from '@tanstack/react-query';

import { Loader } from 'src/core/loading/Loader';
import { FileScanResults } from 'src/features/attachments/types';
import { removeProcessFromInstance } from 'src/features/instance/instanceUtils';
import { useProcessQuery } from 'src/features/instance/useProcessQuery';
import { useInstantiation } from 'src/features/instantiate/useInstantiation';
import { useInstanceOwnerParty } from 'src/features/party/PartiesProvider';
import { useNavigationParam } from 'src/hooks/navigation';
import { fetchInstanceData } from 'src/queries/queries';
import { buildInstanceDataSources } from 'src/utils/instanceDataSources';
import type { IData, IInstance, IInstanceDataSources } from 'src/types/shared';

const emptyArray: never[] = [];
const InstanceContext = React.createContext<IInstance | null>(null);

export const InstanceProvider = ({ children }: PropsWithChildren) => {
  const instanceOwnerPartyId = useNavigationParam('instanceOwnerPartyId');
  const instanceGuid = useNavigationParam('instanceGuid');
  const instantiation = useInstantiation();
  const navigation = useNavigation();

  const { isLoading: isLoadingProcess, error: processError } = useProcessQuery();

  const hasPendingScans = useHasPendingScans();
  const { data } = useInstanceDataQuery({ refetchInterval: hasPendingScans ? 5000 : false });

  if (!instanceOwnerPartyId || !instanceGuid) {
    throw new Error('Missing instanceOwnerPartyId or instanceGuid when creating instance context');
  }

  // const error = instantiation.error ?? instanceDataError ?? processError;
  // if (error) {
  //   return <DisplayError error={error} />;
  // }

  if (!data) {
    return <Loader reason='loading-instance' />;
  }
  if (isLoadingProcess) {
    return <Loader reason='fetching-process' />;
  }

  if (navigation.state === 'loading') {
    return <Loader reason='navigating' />;
  }

  return <InstanceContext.Provider value={data}>{children}</InstanceContext.Provider>;
};

export const useLaxInstanceId = () => window.AltinnAppData?.instance?.id;

export const useStrictInstanceId = () => {
  const instanceId = useLaxInstanceId();
  if (!instanceId) {
    throw new Error('Missing instanceOwnerPartyId or instanceGuid in URL');
  }

  return instanceId;
};

export type ChangeInstanceData = (callback: (instance: IInstance | undefined) => IInstance | undefined) => void;

export function useInstanceDataQueryArgs() {
  const instanceOwnerPartyId = useNavigationParam('instanceOwnerPartyId');
  const instanceGuid = useNavigationParam('instanceGuid');

  return { instanceOwnerPartyId, instanceGuid };
}

export const instanceQueries = {
  all: () => ['instanceData'] as const,
  instanceData: ({
    instanceOwnerPartyId,
    instanceGuid,
  }: {
    instanceOwnerPartyId: string | undefined;
    instanceGuid: string | undefined;
  }) =>
    queryOptions({
      queryKey: [...instanceQueries.all(), { instanceOwnerPartyId, instanceGuid }] as const,
      queryFn:
        !instanceOwnerPartyId || !instanceGuid
          ? skipToken
          : async () => {
              try {
                return await fetchInstanceData(instanceOwnerPartyId, instanceGuid);
              } catch (error) {
                window.logError('Fetching instance data failed:\n', error);
                throw error;
              }
            },
      refetchIntervalInBackground: false,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    }),
};

export function useInstanceDataQuery<R = IInstance>(
  queryOptions: Omit<UseQueryOptions<IInstance, Error, R>, 'queryKey' | 'queryFn'> = {},
) {
  return useQuery<IInstance, Error, R>({
    ...instanceQueries.instanceData(useInstanceDataQueryArgs()),
    refetchOnWindowFocus: queryOptions.refetchInterval !== false,
    select: queryOptions.select, // FIXME: somehow TS complains if this is not here
    ...queryOptions,
  });
}

export function useInstanceDataSources(): IInstanceDataSources | null {
  const instanceOwnerParty = useInstanceOwnerParty();
  return (
    useInstanceDataQuery({
      select: (instance) => buildInstanceDataSources(instance, instanceOwnerParty),
    }).data ?? null
  );
}

export const useDataElementsSelectorProps = () => {
  const dataElements = useInstanceDataQuery({ select: (instance) => instance.data }).data;

  return <U,>(selectDataElements: (data: IData[]) => U) =>
    dataElements ? selectDataElements(dataElements) : undefined;
};

/** Beware that in later versions, this will re-render your component after every save, as
 * the backend sends us updated instance data */
export const useInstanceDataElements = (dataType: string | undefined) =>
  useInstanceDataQuery({
    select: (instance) =>
      dataType ? instance.data.filter((dataElement) => dataElement.dataType === dataType) : instance.data,
  }).data ?? emptyArray;

export function useHasPendingScans(): boolean {
  const dataElements = useInstanceDataQuery({ select: (instance) => instance.data }).data ?? [];
  if (dataElements.length === 0) {
    return false;
  }

  return dataElements.some((dataElement) => dataElement.fileScanResult === FileScanResults.Pending);
}

export function useInvalidateInstanceDataCache() {
  const queryClient = useQueryClient();

  return async () => {
    queryClient.invalidateQueries({ queryKey: instanceQueries.all() });
  };
}

/*********************
 * OPTIMISTIC UPDATES
 *********************/

const useOptimisticInstanceUpdate = () => {
  const queryClient = useQueryClient();
  const { instanceOwnerPartyId, instanceGuid } = useInstanceDataQueryArgs();

  const queryKey =
    !instanceOwnerPartyId || !instanceGuid
      ? undefined
      : instanceQueries.instanceData({
          instanceOwnerPartyId,
          instanceGuid,
        }).queryKey;

  return (updater: (oldData: IInstance) => IInstance | undefined) => {
    queryKey &&
      queryClient.setQueryData(queryKey, (oldData: IInstance | undefined) => {
        if (!oldData) {
          throw new Error('Cannot update instance data cache when there is not cached data');
        }
        return updater(oldData);
      });
  };
};

export const useOptimisticallyAppendDataElements = () => {
  const updateInstance = useOptimisticInstanceUpdate();

  return (elements: IData[]) =>
    updateInstance((oldData) => ({
      ...oldData,
      data: [...oldData.data, ...elements],
    }));
};
export const useOptimisticallyUpdateDataElement = () => {
  const updateInstance = useOptimisticInstanceUpdate();

  return (elementId: string, mutator: (element: IData) => IData) =>
    updateInstance((oldData) => ({
      ...oldData,
      data: oldData.data.map((element) => (element.id === elementId ? mutator(element) : element)),
    }));
};
export const useOptimisticallyRemoveDataElement = () => {
  const updateInstance = useOptimisticInstanceUpdate();

  return (elementId: string) =>
    updateInstance((oldData) => ({
      ...oldData,
      data: oldData.data.filter((element) => element.id !== elementId),
    }));
};
export const useOptimisticallyUpdateCachedInstance = (): ChangeInstanceData => {
  const updateInstance = useOptimisticInstanceUpdate();

  return (callback: (instance: IInstance | undefined) => IInstance | undefined) => {
    updateInstance((oldData) => {
      const next = callback(oldData);
      const clean = next ? removeProcessFromInstance(next) : undefined;
      if (clean && !deepEqual(oldData, clean)) {
        return next;
      }
      return oldData;
    });
  };
};
