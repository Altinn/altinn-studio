import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useInstanceApi } from 'src/core/contexts/ApiProvider';
import { useActiveInstancesQuery } from 'src/core/queries/instance/activeInstances';
import {
  activeInstancesQuery,
  instanceDataQuery,
  instanceQueryKeys,
  useCreateInstance as useCreateInstanceInternal,
  useGetCachedInstanceData,
} from 'src/core/queries/instance/instance.queries';
import {
  useInstanceDataQuery,
  useInstanceDataQueryArgs,
  useInstancePollFailureCount,
  useInvalidateInstanceDataCache,
  useSelectFromInstanceData,
} from 'src/core/queries/instance/instanceHooks';
import { useInstantiation } from 'src/core/queries/instance/useInstantiation';
import { getQueryClient } from 'src/core/queries/queryClient.queries';
import type { InstanceApi, Instantiation } from 'src/core/api-client/instance.api';
import type { AppQueryClient } from 'src/core/queries/queryClient';
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

export function useCreateInstance(language: string) {
  const mutation = useCreateInstanceInternal(language);
  const createInstance: (args: number | Instantiation) => void = mutation.mutate;
  const createInstanceAsync: (args: number | Instantiation) => Promise<IInstance> = mutation.mutateAsync;
  return {
    createInstance,
    createInstanceAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

export function prefetchActiveInstances(client: AppQueryClient, partyId: string, instanceApi: InstanceApi) {
  const queryClient = getQueryClient(client);
  return queryClient.ensureQueryData(activeInstancesQuery({ partyId, instanceApi }));
}

export function prefetchInstanceData(
  client: AppQueryClient,
  params: { instanceOwnerPartyId: string; instanceGuid: string; instanceApi: InstanceApi },
) {
  const queryClient = getQueryClient(client);
  return queryClient.prefetchQuery(instanceDataQuery(params));
}

export function ensureInstanceData(
  client: AppQueryClient,
  params: { instanceOwnerPartyId: string; instanceGuid: string; instanceApi: InstanceApi },
) {
  const queryClient = getQueryClient(client);
  return queryClient.ensureQueryData(instanceDataQuery(params));
}

export function fetchFreshInstanceData(
  client: AppQueryClient,
  params: { instanceOwnerPartyId: string; instanceGuid: string; instanceApi: InstanceApi },
) {
  const queryClient = getQueryClient(client);
  return queryClient.fetchQuery({ ...instanceDataQuery(params), staleTime: 0 });
}

export function invalidateInstanceData(client: AppQueryClient) {
  const queryClient = getQueryClient(client);
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

export {
  useGetCachedInstanceData,
  useInstanceDataQuery,
  useInstanceDataQueryArgs,
  useInstancePollFailureCount,
  useInvalidateInstanceDataCache,
  useSelectFromInstanceData,
  useInstantiation,
  useActiveInstancesQuery,
};
