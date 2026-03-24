import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

import {
  activeInstancesQuery,
  instanceDataQuery,
  instanceQueryKeys,
  useCreateInstance as useCreateInstanceInternal,
} from 'src/core/queries/instance/instance.queries';
import { parseInstanceId } from 'src/core/queries/instance/utils';
import type { BaseQueryResult } from 'src/core/queries/types';
import type { ISimpleInstance } from 'src/types';
import type { IInstance } from 'src/types/shared';

interface UseActiveInstancesResult extends BaseQueryResult {
  instances: ISimpleInstance[] | undefined;
}

function useActiveInstances(partyId: string): UseActiveInstancesResult {
  const query = useQuery(activeInstancesQuery(partyId));
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

function prefetchActiveInstances(queryClient: QueryClient, partyId: string) {
  return queryClient.ensureQueryData(activeInstancesQuery(partyId));
}

function prefetchInstanceData(
  queryClient: QueryClient,
  params: { instanceOwnerPartyId: string; instanceGuid: string },
) {
  return queryClient.prefetchQuery(instanceDataQuery(params));
}

function invalidateInstanceData(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: instanceQueryKeys.all() });
}

export {
  parseInstanceId,
  invalidateInstanceData,
  prefetchActiveInstances,
  prefetchInstanceData,
  useActiveInstances,
  useCreateInstance,
  useCurrentInstance,
};
