import { useQuery } from '@tanstack/react-query';
import {
  activeInstancesQuery,
  useCreateInstance as useCreateInstanceInternal,
} from 'nextsrc/core/queries/instance/instance.queries';
import { extractInstanceOwnerPartyIdAndInstanceGuidFromInstanceId } from 'nextsrc/core/queries/instance/utils';
import type { QueryClient } from '@tanstack/react-query';

import type { BaseQueryResult } from 'nextsrc/core/queries/types';

import type { ISimpleInstance } from 'src/types';
import type { IInstance } from 'src/types/shared';

interface UseActiveInstancesResult extends BaseQueryResult {
  instances: ISimpleInstance[] | undefined;
}

function useActiveInstances(instanceOwnerPartyId: string): UseActiveInstancesResult {
  const query = useQuery(activeInstancesQuery(instanceOwnerPartyId));
  return { instances: query.data, isLoading: query.isLoading, error: query.error };
}

interface UseCreateInstanceResult {
  createInstance: () => void;
  createInstanceAsync: () => Promise<IInstance>;
  isPending: boolean;
  error: Error | null;
}

function useCreateInstance(): UseCreateInstanceResult {
  const mutation = useCreateInstanceInternal();
  return {
    createInstance: mutation.mutate,
    createInstanceAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

function prefetchActiveInstances(queryClient: QueryClient, instanceOwnerPartyId: string) {
  return queryClient.ensureQueryData(activeInstancesQuery(instanceOwnerPartyId));
}

export {
  extractInstanceOwnerPartyIdAndInstanceGuidFromInstanceId,
  prefetchActiveInstances,
  useActiveInstances,
  useCreateInstance,
};
