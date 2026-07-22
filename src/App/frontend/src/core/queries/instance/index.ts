import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

import { useInstanceApi } from 'src/core/contexts/ApiProvider';
import {
  activeInstancesQuery,
  instanceDataQuery,
  instanceQueryKeys,
  useCreateInstance as useCreateInstanceInternal,
  useGetCachedInstanceData,
} from 'src/core/queries/instance/instance.queries';
import type { InstanceApi } from 'src/core/api-client/instance.api';
import type { BaseQueryResult } from 'src/core/queries/types';
import type { ISimpleInstance } from 'src/types';
import type { IInstance } from 'src/types/shared';

interface UseActiveInstancesResult extends BaseQueryResult {
  instances: ISimpleInstance[] | undefined;
}

export function useActiveInstances(partyId: string): UseActiveInstancesResult {
  const instanceApi = useInstanceApi();
  const query = useQuery(activeInstancesQuery({ partyId, instanceApi }));
  return { instances: query.data, isLoading: query.isLoading, error: query.error };
}

export function useCurrentInstance(): IInstance | undefined {
  const queryClient = useQueryClient();
  return queryClient
    .getQueriesData<IInstance>({ queryKey: instanceQueryKeys.all() })
    .find(([key, data]) => data && key.length === 2 && typeof key[1] === 'object')?.[1];
}

export interface CachedInstanceQueries {
  countDataElements: (instanceId: string | undefined, dataType: string) => number;
  getCachedInstance: (instanceId: string | undefined) => IInstance | undefined;
}

export function createCachedInstanceQueries(queryClient: QueryClient): CachedInstanceQueries {
  return {
    countDataElements: (instanceId, dataType) => {
      const data = getCachedInstance(queryClient, instanceId)?.data;
      return data ? data.filter((element) => element.dataType === dataType).length : 0;
    },
    getCachedInstance: (instanceId) => getCachedInstance(queryClient, instanceId),
  };
}

function getCachedInstance(queryClient: QueryClient, instanceId: string | undefined): IInstance | undefined {
  if (!instanceId) {
    return undefined;
  }
  const [instanceOwnerPartyId, instanceGuid] = instanceId.split('/');
  return queryClient.getQueryData<IInstance>(instanceQueryKeys.instance({ instanceOwnerPartyId, instanceGuid }));
}

export function useCreateInstance(language: string) {
  const mutation = useCreateInstanceInternal(language);
  return {
    createInstance: mutation.mutate,
    createInstanceAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

export function prefetchActiveInstances(queryClient: QueryClient, partyId: string, instanceApi: InstanceApi) {
  return queryClient.ensureQueryData(activeInstancesQuery({ partyId, instanceApi }));
}

export function prefetchInstanceData(
  queryClient: QueryClient,
  params: { instanceOwnerPartyId: string; instanceGuid: string; instanceApi: InstanceApi },
) {
  return queryClient.prefetchQuery(instanceDataQuery(params));
}

export function ensureInstanceData(
  queryClient: QueryClient,
  params: { instanceOwnerPartyId: string; instanceGuid: string; instanceApi: InstanceApi },
) {
  return queryClient.ensureQueryData(instanceDataQuery(params));
}

export function fetchFreshInstanceData(
  queryClient: QueryClient,
  params: { instanceOwnerPartyId: string; instanceGuid: string; instanceApi: InstanceApi },
) {
  return queryClient.fetchQuery({ ...instanceDataQuery(params), staleTime: 0 });
}

export function invalidateInstanceData(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: instanceQueryKeys.all() });
}

export function useOptimisticallyUpdateInstance() {
  const queryClient = useQueryClient();

  return (updater: (oldData: IInstance) => IInstance) => {
    const cached = queryClient.getQueriesData<IInstance>({ queryKey: instanceQueryKeys.all() });
    const entry = cached.find(([key, data]) => data && key.length === 2 && typeof key[1] === 'object');
    if (entry) {
      const [queryKey, oldData] = entry;
      if (oldData) {
        queryClient.setQueryData(queryKey, updater(oldData));
      }
    }
  };
}

export function parseInstanceId(instanceId: string): {
  instanceGuid: string;
  instanceOwnerPartyId: string;
} {
  if (!isInstanceId(instanceId)) {
    throw new Error('The provided string is not an instance id.');
  }

  const [instanceOwnerPartyId, instanceGuid] = instanceId.split('/');
  return { instanceOwnerPartyId, instanceGuid };
}

function isInstanceId(instanceId: string): instanceId is `${string}/${string}` {
  return instanceId.includes('/');
}

export { instanceDataQuery, activeInstancesQuery, useGetCachedInstanceData, instanceQueryKeys };
