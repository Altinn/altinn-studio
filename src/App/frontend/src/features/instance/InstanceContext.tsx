import React from 'react';
import { useNavigation } from 'react-router';
import type { PropsWithChildren } from 'react';

import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import deepEqual from 'fast-deep-equal';
import type { UseQueryOptions } from '@tanstack/react-query';

import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { Loader } from 'src/core/loading/Loader';
import { invalidateInstanceData, useOptimisticallyUpdateInstance } from 'src/core/queries/instance';
import { instanceDataQuery, instanceQueryKeys } from 'src/core/queries/instance/instance.queries';
import { FileScanResults } from 'src/features/attachments/types';
import { useInstantiation } from 'src/features/instantiate/useInstantiation';
import { useInstanceOwnerParty } from 'src/features/party/PartiesProvider';
import { useNavigationParam } from 'src/hooks/navigation';
import { buildInstanceDataSources } from 'src/utils/instanceDataSources';
import type { IData, IInstance, IInstanceDataSources } from 'src/types/shared';

const emptyArray: never[] = [];
const InstanceContext = React.createContext<IInstance | null>(null);

export const InstanceProvider = ({ children }: PropsWithChildren) => {
  const instanceOwnerPartyId = useNavigationParam('instanceOwnerPartyId');
  const instanceGuid = useNavigationParam('instanceGuid');
  const instantiation = useInstantiation();
  const navigation = useNavigation();

  const hasPendingScans = useHasPendingScans();
  const { error: instanceDataError, data } = useInstanceDataQuery({ refetchInterval: hasPendingScans ? 5000 : false });

  if (!instanceOwnerPartyId || !instanceGuid) {
    throw new Error('Missing instanceOwnerPartyId or instanceGuid when creating instance context');
  }

  const error = instantiation.error ?? instanceDataError;
  if (error) {
    return <DisplayError error={error} />;
  }

  if (!data) {
    return <Loader reason='loading-instance' />;
  }

  if (navigation.state === 'loading') {
    return <Loader reason='navigating' />;
  }

  return <InstanceContext.Provider value={data}>{children}</InstanceContext.Provider>;
};

export const useLaxInstanceId = () => {
  const instanceOwnerPartyId = useNavigationParam('instanceOwnerPartyId');
  const instanceGuid = useNavigationParam('instanceGuid');
  return instanceOwnerPartyId && instanceGuid ? `${instanceOwnerPartyId}/${instanceGuid}` : undefined;
};

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

export function useInstanceDataQuery<R = IInstance>(
  queryOptions: Omit<UseQueryOptions<IInstance, Error, R>, 'queryKey' | 'queryFn'> = {},
) {
  const { instanceOwnerPartyId, instanceGuid } = useInstanceDataQueryArgs();
  const hasParams = !!instanceOwnerPartyId && !!instanceGuid;

  return useQuery<IInstance, Error, R>({
    ...(hasParams
      ? instanceDataQuery({ instanceOwnerPartyId, instanceGuid })
      : {
          queryKey: [...instanceQueryKeys.all(), { instanceOwnerPartyId, instanceGuid }] as const,
          queryFn: skipToken,
        }),
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

  return () => invalidateInstanceData(queryClient);
}

/*********************
 * OPTIMISTIC UPDATES
 *********************/

export const useOptimisticallyAppendDataElements = () => {
  const updateInstance = useOptimisticallyUpdateInstance();

  return (elements: IData[]) =>
    updateInstance((oldData) => ({
      ...oldData,
      data: [...oldData.data, ...elements],
    }));
};
export const useOptimisticallyUpdateDataElement = () => {
  const updateInstance = useOptimisticallyUpdateInstance();

  return (elementId: string, mutator: (element: IData) => IData) =>
    updateInstance((oldData) => ({
      ...oldData,
      data: oldData.data.map((element) => (element.id === elementId ? mutator(element) : element)),
    }));
};
export const useOptimisticallyRemoveDataElement = () => {
  const updateInstance = useOptimisticallyUpdateInstance();

  return (elementId: string) =>
    updateInstance((oldData) => ({
      ...oldData,
      data: oldData.data.filter((element) => element.id !== elementId),
    }));
};
export const useOptimisticallyUpdateCachedInstance = (): ChangeInstanceData => {
  const updateInstance = useOptimisticallyUpdateInstance();

  return (callback: (instance: IInstance | undefined) => IInstance | undefined) => {
    updateInstance((oldData) => {
      const next = callback(oldData);
      if (next && !deepEqual(oldData, next)) {
        return next;
      }
      return oldData;
    });
  };
};
