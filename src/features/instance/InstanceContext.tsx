import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { createContext } from 'src/core/contexts/context';
import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { Loader } from 'src/core/loading/Loader';
import { ProcessProvider } from 'src/features/instance/ProcessContext';
import { useInstantiation } from 'src/features/instantiate/InstantiationContext';
import { useStateDeepEqual } from 'src/hooks/useStateDeepEqual';
import { buildInstanceDataSources } from 'src/utils/instanceDataSources';
import { isAxiosError } from 'src/utils/isAxiosError';
import type { QueryDefinition } from 'src/core/queries/usePrefetchQuery';
import type { IInstance, IInstanceDataSources } from 'src/types/shared';

export interface InstanceContext {
  // Instance identifiers
  partyId: string;
  instanceGuid: string;
  instanceId: string;

  // Data
  data: IInstance | undefined;
  dataSources: IInstanceDataSources | null;

  // Fetching/query states
  isFetching: boolean;
  error: AxiosError | undefined;

  // Methods/utilities
  changeData: ChangeInstanceData;
  reFetch: () => Promise<void>;
}

export type ChangeInstanceData = (callback: (instance: IInstance | undefined) => IInstance | undefined) => void;

const { Provider, useCtx, useHasProvider } = createContext<InstanceContext | undefined>({
  name: 'InstanceContext',
  required: false,
  default: undefined,
});

// Also used for prefetching @see appPrefetcher.ts
export function useInstanceDataQueryDef(partyId?: string, instanceGuid?: string): QueryDefinition<IInstance> {
  const { fetchInstanceData } = useAppQueries();
  return {
    queryKey: ['fetchInstanceData', partyId, instanceGuid],
    queryFn: partyId && instanceGuid ? () => fetchInstanceData(partyId, instanceGuid) : skipToken,
    enabled: !!partyId && !!instanceGuid,
  };
}

function useGetInstanceDataQuery(partyId: string, instanceGuid: string) {
  const utils = useQuery(useInstanceDataQueryDef(partyId, instanceGuid));

  useEffect(() => {
    utils.error && window.logError('Fetching instance data failed:\n', utils.error);
  }, [utils.error]);

  return utils;
}

export const InstanceProvider = ({ children }: { children: React.ReactNode }) => {
  const { partyId, instanceGuid } = useParams();

  if (!partyId || !instanceGuid) {
    return null;
  }

  return (
    <InnerInstanceProvider
      partyId={partyId}
      instanceGuid={instanceGuid}
    >
      {children}
    </InnerInstanceProvider>
  );
};

const InnerInstanceProvider = ({
  children,
  partyId,
  instanceGuid,
}: {
  children: React.ReactNode;
  partyId: string;
  instanceGuid: string;
}) => {
  const queryClient = useQueryClient();
  const [data, setData] = useStateDeepEqual<IInstance | undefined>(undefined);
  const [error, setError] = useState<AxiosError | undefined>(undefined);
  const dataSources = useMemo(() => buildInstanceDataSources(data), [data]);

  const instantiation = useInstantiation();

  const fetchQuery = useGetInstanceDataQuery(partyId, instanceGuid);

  const changeData: ChangeInstanceData = useCallback(
    (callback) => {
      setData((prev) => {
        const next = callback(prev);
        if (next) {
          return next;
        }
        return prev;
      });
    },
    [setData],
  );

  // Update data
  useEffect(() => {
    changeData((prev) => (instantiation.error ? undefined : instantiation.lastResult ?? prev));
  }, [changeData, instantiation.lastResult, instantiation.error]);

  useEffect(() => {
    changeData((prev) => (fetchQuery.error ? undefined : fetchQuery.data ?? prev));
  }, [changeData, fetchQuery.data, fetchQuery.error]);

  // Update error states
  useEffect(() => {
    fetchQuery.error && isAxiosError(fetchQuery.error) && setError(fetchQuery.error);
    instantiation.error && setError(instantiation.error);
  }, [fetchQuery.error, instantiation.error]);

  if (error) {
    return <DisplayError error={error} />;
  }

  if (!data) {
    return <Loader reason='instance' />;
  }

  return (
    <Provider
      value={{
        data,
        dataSources,
        isFetching: fetchQuery.isFetching,
        error,
        changeData,
        reFetch: async () => {
          setData(undefined);
          await queryClient.invalidateQueries({ queryKey: ['fetchInstanceData'] });
        },
        partyId,
        instanceGuid,
        instanceId: `${partyId}/${instanceGuid}`,
      }}
    >
      <ProcessProvider instance={data}>{children}</ProcessProvider>
    </Provider>
  );
};

/**
 * There are strict and lax (relaxed) versions of both of these. The lax versions will return undefined if the context
 * is not available, while the strict versions will throw an error. Always prefer the strict versions in code you
 * know should only be used in instanceful contexts. Code paths that have to work in stateless/instanceless contexts
 * should use the lax versions and handle the undefined case.
 */

export const useLaxInstance = () => useCtx();
export const useLaxInstanceData = () => useLaxInstance()?.data;
export const useLaxInstanceDataSources = () => useLaxInstance()?.dataSources ?? null;
export const useHasInstance = () => useHasProvider();

export const useStrictInstance = () => {
  const instance = useLaxInstance();
  if (!instance) {
    throw new Error('Tried using instance context outside of instance context provider');
  }

  return instance;
};

export const useStrictInstanceData = () => {
  const data = useStrictInstance().data;
  if (!data) {
    throw new Error('Tried using instance data before data was loaded');
  }

  return data;
};
