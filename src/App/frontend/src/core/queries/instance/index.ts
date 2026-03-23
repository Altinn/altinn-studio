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

function getCurrentInstance(queryClient: QueryClient): IInstance | undefined {
  return queryClient.getQueryData<IInstance>(instanceQueryKeys.current());
}

function setCurrentInstance(queryClient: QueryClient, instance: IInstance | undefined): void {
  queryClient.setQueryData(instanceQueryKeys.current(), instance);
}

function useCurrentInstance(): IInstance | undefined {
  const queryClient = useQueryClient();
  return getCurrentInstance(queryClient);
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

async function prefetchInstanceData(
  queryClient: QueryClient,
  params: { instanceOwnerPartyId: string; instanceGuid: string },
) {
  const instance = await queryClient.ensureQueryData(instanceDataQuery(params));
  setCurrentInstance(queryClient, instance);
  return instance;
}

function invalidateInstanceData(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: instanceQueryKeys.all() });
}

export {
  parseInstanceId,
  invalidateInstanceData,
  prefetchActiveInstances,
  prefetchInstanceData,
  setCurrentInstance,
  useActiveInstances,
  useCreateInstance,
  useCurrentInstance,
};
