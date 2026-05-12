import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

import { useInstanceApi } from 'src/core/contexts/ApiProvider';
import {
  activeInstancesQuery,
  instanceDataQuery,
  instanceQueryKeys,
  useCreateInstance as useCreateInstanceInternal,
} from 'src/core/queries/instance/instance.queries';
import { parseInstanceId } from 'src/core/queries/instance/utils';
import type { InstanceApi } from 'src/core/api-client/instance.api';
import type { BaseQueryResult } from 'src/core/queries/types';
import type { ISimpleInstance } from 'src/types';
import type { IInstance } from 'src/types/shared';

interface UseActiveInstancesResult extends BaseQueryResult {
  instances: ISimpleInstance[] | undefined;
}

function useActiveInstances(partyId: string): UseActiveInstancesResult {
  const instanceApi = useInstanceApi();
  const query = useQuery(activeInstancesQuery({ partyId, instanceApi }));
  return { instances: query.data, isLoading: query.isLoading, error: query.error };
}

function useCurrentInstance(): IInstance | undefined {
  const queryClient = useQueryClient();
  return queryClient
    .getQueriesData<IInstance>({ queryKey: instanceQueryKeys.all() })
    .find(([key, data]) => data && key.length === 2 && typeof key[1] === 'object')?.[1];
}

function useCreateInstance(language: string) {
  const mutation = useCreateInstanceInternal(language);
  return {
    createInstance: mutation.mutate,
    createInstanceAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

function prefetchActiveInstances(queryClient: QueryClient, partyId: string, instanceApi: InstanceApi) {
  return queryClient.ensureQueryData(activeInstancesQuery({ partyId, instanceApi }));
}

function prefetchInstanceData(
  queryClient: QueryClient,
  params: { instanceOwnerPartyId: string; instanceGuid: string; instanceApi: InstanceApi },
) {
  return queryClient.prefetchQuery(instanceDataQuery(params));
}

function ensureInstanceData(
  queryClient: QueryClient,
  params: { instanceOwnerPartyId: string; instanceGuid: string; instanceApi: InstanceApi },
) {
  return queryClient.ensureQueryData(instanceDataQuery(params));
}

function fetchFreshInstanceData(
  queryClient: QueryClient,
  params: { instanceOwnerPartyId: string; instanceGuid: string; instanceApi: InstanceApi },
) {
  return queryClient.fetchQuery({ ...instanceDataQuery(params), staleTime: 0 });
}

function invalidateInstanceData(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: instanceQueryKeys.all() });
}

function useOptimisticallyUpdateInstance() {
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

export {
  parseInstanceId,
  invalidateInstanceData,
  prefetchActiveInstances,
  fetchFreshInstanceData,
  prefetchInstanceData,
  ensureInstanceData,
  instanceQueryKeys,
  useActiveInstances,
  useCreateInstance,
  useCurrentInstance,
  useOptimisticallyUpdateInstance,
};
