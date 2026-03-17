import { useQuery } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

import {
  activeInstancesQuery,
  instanceQueries,
  useCreateInstance as useCreateInstanceInternal,
} from 'src/core/queries/instance/instance.queries';
import { extractInstanceOwnerPartyIdAndInstanceGuidFromInstanceId } from 'src/core/queries/instance/utils';
import type { BaseQueryResult } from 'src/core/queries/types';
import type { Instantiation } from 'src/features/instantiate/useInstantiation';
import type { ISimpleInstance } from 'src/types';
import type { IInstance } from 'src/types/shared';

interface UseActiveInstancesResult extends BaseQueryResult {
  instances: ISimpleInstance[] | undefined;
}

function useActiveInstances(partyId: string): UseActiveInstancesResult {
  const query = useQuery(activeInstancesQuery(partyId));
  return { instances: query.data, isLoading: query.isLoading, error: query.error };
}

interface UseCreateInstanceResult {
  createInstance: (args: number | Instantiation) => void;
  createInstanceAsync: (args: number | Instantiation) => Promise<IInstance>;
  isPending: boolean;
  error: Error | null;
}

function useCreateInstance(language: string): UseCreateInstanceResult {
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

export {
  extractInstanceOwnerPartyIdAndInstanceGuidFromInstanceId,
  instanceQueries,
  prefetchActiveInstances,
  useActiveInstances,
  useCreateInstance,
};
