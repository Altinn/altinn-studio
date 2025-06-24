import React, { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { skipToken, useQuery } from '@tanstack/react-query';
import deepEqual from 'fast-deep-equal';
import { createStore } from 'zustand';
import type { QueryObserverResult } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { ContextNotProvided } from 'src/core/contexts/context';
import { createZustandContext } from 'src/core/contexts/zustandContext';
import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { Loader } from 'src/core/loading/Loader';
import { useHasPendingScans } from 'src/features/attachments/useHasPendingScans';
import { cleanUpInstanceData } from 'src/features/instance/instanceUtils';
import { ProcessProvider } from 'src/features/instance/ProcessContext';
import { useInstantiation } from 'src/features/instantiate/InstantiationContext';
import { useInstanceOwnerParty } from 'src/features/party/PartiesProvider';
import { useNavigationParam } from 'src/features/routing/AppRoutingContext';
import { buildInstanceDataSources } from 'src/utils/instanceDataSources';
import type { QueryDefinition } from 'src/core/queries/usePrefetchQuery';
import type { IData, IInstance, IInstanceDataSources } from 'src/types/shared';

export interface InstanceContext {
  // Data
  data: IInstance | undefined;

  // Methods/utilities
  appendDataElements: (element: IData[]) => void;
  mutateDataElement: (elementId: string, mutator: (element: IData) => IData) => void;
  removeDataElement: (elementId: string) => void;

  changeData: ChangeInstanceData;
  reFetch: () => Promise<QueryObserverResult<IInstance>>;
  setReFetch: (reFetch: () => Promise<QueryObserverResult<IInstance>>) => void;
}

export type ChangeInstanceData = (callback: (instance: IInstance | undefined) => IInstance | undefined) => void;

const {
  Provider,
  useMemoSelector,
  useSelector,
  useLaxMemoSelector,
  useHasProvider,
  useLaxStore,
  useLaxDelayedSelectorProps,
} = createZustandContext({
  name: 'InstanceContext',
  required: true,
  initialCreateStore: () =>
    createStore<InstanceContext>((set) => ({
      data: undefined,
      appendDataElements: (elements) =>
        set((state) => {
          if (!state.data) {
            throw new Error('Cannot append data element when instance data is not set');
          }
          const next = { ...state.data, data: [...state.data.data, ...elements] };
          return { ...state, data: next };
        }),
      mutateDataElement: (elementId, mutator) =>
        set((state) => {
          if (!state.data) {
            throw new Error('Cannot mutate data element when instance data is not set');
          }
          const next = {
            ...state.data,
            data: state.data.data.map((element) => (element.id === elementId ? mutator(element) : element)),
          };
          return { ...state, data: next };
        }),
      removeDataElement: (elementId) =>
        set((state) => {
          if (!state.data) {
            throw new Error('Cannot remove data element when instance data is not set');
          }
          const next = { ...state.data, data: state.data.data.filter((element) => element.id !== elementId) };
          return { ...state, data: next };
        }),
      changeData: (callback) =>
        set((state) => {
          const next = callback(state.data);
          const clean = cleanUpInstanceData(next);
          if (clean && !deepEqual(state.data, clean)) {
            return { ...state, data: next };
          }
          return {};
        }),
      reFetch: async () => {
        throw new Error('reFetch not implemented yet');
      },
      setReFetch: (reFetch) =>
        set({
          reFetch: async () => {
            const result = await reFetch();
            set((state) => ({ ...state, data: result.data }));
            return result;
          },
        }),
    })),
});

export const instanceQueryKeys = {
  instanceData: (instanceOwnerPartyId: string | undefined, instanceGuid: string | undefined) => [
    'instanceData',
    instanceOwnerPartyId,
    instanceGuid,
  ],
};

// Also used for prefetching @see appPrefetcher.ts
export function useInstanceDataQueryDef(
  hasResultFromInstantiation: boolean,
  partyId?: string,
  instanceGuid?: string,
): QueryDefinition<IInstance> {
  const { fetchInstanceData } = useAppQueries();
  return {
    queryKey: instanceQueryKeys.instanceData(partyId, instanceGuid),
    queryFn: partyId && instanceGuid ? () => fetchInstanceData(partyId, instanceGuid) : skipToken,
    enabled: !!partyId && !!instanceGuid && !hasResultFromInstantiation,
  };
}

function useGetInstanceDataQuery(
  hasResultFromInstantiation: boolean,
  partyId: string,
  instanceGuid: string,
  enablePolling: boolean = false,
) {
  const queryDef = useInstanceDataQueryDef(hasResultFromInstantiation, partyId, instanceGuid);

  const utils = useQuery({
    ...queryDef,
    refetchInterval: enablePolling ? 5000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: enablePolling,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  useEffect(() => {
    utils.error && window.logError('Fetching instance data failed:\n', utils.error);
  }, [utils.error]);

  return utils;
}

export const InstanceProvider = ({ children }: { children: React.ReactNode }) => (
  <Provider>
    <BlockUntilLoaded>
      <ProcessProvider>{children}</ProcessProvider>
    </BlockUntilLoaded>
  </Provider>
);

const BlockUntilLoaded = ({ children }: PropsWithChildren) => {
  const instanceOwnerPartyId = useNavigationParam('instanceOwnerPartyId');
  const instanceGuid = useNavigationParam('instanceGuid');
  if (!instanceOwnerPartyId || !instanceGuid) {
    throw new Error('Missing partyId or instanceGuid when creating instance context');
  }

  const changeData = useSelector((state) => state.changeData);
  const setReFetch = useSelector((state) => state.setReFetch);
  const instantiation = useInstantiation();
  const isDataSet = useSelector((state) => state.data !== undefined);

  const hasPendingScans = useHasPendingScans();
  const enablePolling = isDataSet && hasPendingScans;

  const {
    error: queryError,
    isLoading,
    data: queryData,
    refetch,
  } = useGetInstanceDataQuery(!!instantiation.lastResult, instanceOwnerPartyId, instanceGuid, enablePolling);

  const error = instantiation.error ?? queryError;
  const data = instantiation.lastResult ?? queryData;

  if (!window.inUnitTest && data && !data.id.endsWith(instanceGuid)) {
    throw new Error(
      `Mismatch between instanceGuid in URL and fetched instance data (URL: '${instanceGuid}', data: '${data.id}')`,
    );
  }

  useEffect(() => {
    data && changeData(() => data);
  }, [changeData, data]);

  useEffect(() => {
    setReFetch(refetch);
  }, [refetch, setReFetch]);

  if (error) {
    return <DisplayError error={error} />;
  }

  if (isLoading || !isDataSet) {
    return <Loader reason='instance' />;
  }

  return children;
};

/**
 * There are strict and lax (relaxed) versions of both of these. The lax versions will return undefined if the context
 * is not available, while the strict versions will throw an error. Always prefer the strict versions in code you
 * know should only be used in instanceful contexts. Code paths that have to work in stateless/instanceless contexts
 * should use the lax versions and handle the undefined case.
 */
export function useLaxInstance<U>(selector: (state: InstanceContext) => U) {
  const out = useLaxMemoSelector(selector);
  return out === ContextNotProvided ? undefined : out;
}

const emptyArray: never[] = [];

export const useLaxInstanceId = () => {
  const instanceOwnerPartyId = useNavigationParam('instanceOwnerPartyId');
  const instanceGuid = useNavigationParam('instanceGuid');
  return instanceOwnerPartyId && instanceGuid ? `${instanceOwnerPartyId}/${instanceGuid}` : undefined;
};

export const useLaxInstanceData = <U,>(selector: (data: IInstance) => U) =>
  useLaxInstance((state) => (state.data ? selector(state.data) : undefined));
export const useLaxInstanceAllDataElements = () => useLaxInstance((state) => state.data?.data) ?? emptyArray;
export const useLaxInstanceStatus = () => useLaxInstance((state) => state.data?.status);
export const useLaxAppendDataElements = () => useLaxInstance((state) => state.appendDataElements);
export const useLaxMutateDataElement = () => useLaxInstance((state) => state.mutateDataElement);
export const useLaxRemoveDataElement = () => useLaxInstance((state) => state.removeDataElement);
export const useLaxChangeInstance = (): ChangeInstanceData | undefined => useLaxInstance((state) => state.changeData);
export const useHasInstance = () => useHasProvider();

export function useLaxInstanceDataSources(): IInstanceDataSources | null {
  const instanceOwnerParty = useInstanceOwnerParty();
  return useLaxInstanceData((data) => buildInstanceDataSources(data, instanceOwnerParty)) ?? null;
}

/** Beware that in later versions, this will re-render your component after every save, as
 * the backend sends us updated instance data */
export const useLaxInstanceDataElements = (dataType: string | undefined) =>
  useLaxInstance((state) => state.data?.data.filter((d) => d.dataType === dataType)) ?? emptyArray;

export type DataElementSelector = <U>(selector: (data: IData[]) => U, deps: unknown[]) => U | typeof ContextNotProvided;
const dataElementsInnerSelector = (state: InstanceContext): [IData[]] => [state.data?.data ?? emptyArray];

export const useLaxDataElementsSelectorProps = () =>
  useLaxDelayedSelectorProps({
    mode: 'innerSelector',
    makeArgs: dataElementsInnerSelector,
  });

/** Like useLaxInstanceAllDataElements, but will never re-render when the data changes */
export const useLaxInstanceAllDataElementsNow = () => {
  const store = useLaxStore();
  if (store === ContextNotProvided) {
    return emptyArray;
  }
  return store.getState().data?.data ?? emptyArray;
};

export const useStrictInstanceRefetch = () => useSelector((state) => state.reFetch);
export const useStrictInstanceId = () => {
  const instanceOwnerPartyId = useNavigationParam('instanceOwnerPartyId');
  const instanceGuid = useNavigationParam('instanceGuid');
  if (!instanceOwnerPartyId || !instanceGuid) {
    throw new Error('Missing partyId or instanceGuid in URL');
  }
  return `${instanceOwnerPartyId}/${instanceGuid}`;
};
export const useStrictAppendDataElements = () => useSelector((state) => state.appendDataElements);
export const useStrictRemoveDataElement = () => useSelector((state) => state.removeDataElement);
export const useStrictDataElements = (dataType: string | undefined) =>
  useMemoSelector((state) => state.data?.data.filter((d) => d.dataType === dataType)) ?? emptyArray;
