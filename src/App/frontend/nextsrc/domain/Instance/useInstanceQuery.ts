import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import deepEqual from 'fast-deep-equal';

import { FileScanResults } from 'src/features/attachments/types';
import { removeProcessFromInstance } from 'src/features/instance/instanceUtils';
import { useInstanceOwnerParty } from 'src/features/party/PartiesProvider';
import { useNavigationParam } from 'src/hooks/navigation';
import { fetchInstanceData } from 'src/http-client/queries';
import { buildInstanceDataSources } from 'src/utils/instanceDataSources';
import type { IData, IInstance, IInstanceDataSources } from 'src/types/shared';

export const emptyArray: never[] = [];
export const useLaxInstanceId = () => window.AltinnAppInstanceData?.instance?.id;
export const useStrictInstanceId = () => {
  const instanceId = useLaxInstanceId();
  if (!instanceId) {
    throw new Error('Missing instanceOwnerPartyId or instanceGuid in URL');
  }

  return instanceId;
};
export type ChangeInstanceData = (callback: (instance: IInstance | undefined) => IInstance | undefined) => void;

export function useInstanceDataSources(): IInstanceDataSources | null {
  const instanceOwnerParty = useInstanceOwnerParty();
  const instance = useInstance();
  return buildInstanceDataSources(instance, instanceOwnerParty);
}

export const useDataElementsSelectorProps = () => {
  const dataElements = useInstance()?.data;
  return <U>(selectDataElements: (data: IData[]) => U) => (dataElements ? selectDataElements(dataElements) : undefined);
};
/** Beware that in later versions, this will re-render your component after every save, as
 * the backend sends us updated instance data */
export const useInstanceDataElements = (dataType: string | undefined) => {
  const instance = useInstance();
  if (!instance?.data) {
    return emptyArray;
  }
  return dataType ? instance?.data.filter((dt) => dt.dataType === dataType) : instance?.data;
};

export function useHasPendingScans(): boolean {
  const dataElements = useInstanceDataElements(undefined);
  if (dataElements.length === 0) {
    return false;
  }

  return dataElements.some((dataElement) => dataElement.fileScanResult === FileScanResults.Pending);
}

type InstanceDataParams = {
  instanceOwnerPartyId: string | undefined;
  instanceGuid: string | undefined;
};

export function instanceDataQueryKey({ instanceOwnerPartyId, instanceGuid }: InstanceDataParams) {
  return ['instanceData', { instanceOwnerPartyId, instanceGuid }] as const;
}

// export const useInstance = () => {
//   const
//   if (true) {
//     return {} as IInstance;
//   }
//   return undefined;
// };
export const instanceQueries = {
  all: () => ['instanceData'] as const,
  instanceData: ({ instanceOwnerPartyId, instanceGuid }: InstanceDataParams) =>
    queryOptions({
      queryKey: instanceDataQueryKey({ instanceOwnerPartyId, instanceGuid }),
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
  const instance = useInstanceDataQuery().data;
  const instanceOwnerPartyId = instance?.instanceOwner.partyId;
  const instanceGuid = instance?.id.split('/')[1];

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

export function useInstanceDataQuery<R = IInstance>() {
  const instanceOwnerPartyId = useNavigationParam('instanceOwnerPartyId');
  const instanceGuid = useNavigationParam('instanceGuid');
  return useQuery<IInstance, Error, R>({
    queryKey: instanceDataQueryKey({ instanceOwnerPartyId, instanceGuid }),
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
  });
}

export const useInstance = (): IInstance | undefined => useInstanceDataQuery().data;
