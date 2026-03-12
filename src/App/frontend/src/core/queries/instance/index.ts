import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

import { instanceDataQueryOptions, instanceQueryKeys } from 'src/core/queries/instance/instance.queries';
import { useNavigationParam } from 'src/hooks/navigation';
import type { InstanceQueryParams } from 'src/core/queries/instance/instance.queries';
import type { IData, IInstance } from 'src/types/shared';

/**
 * Prefetch instance data into the query cache. Blocks until data is available.
 * Used in route loaders to ensure instance data is cached before components render.
 */
export async function ensureInstanceData(
  queryClient: QueryClient,
  params: { instanceOwnerPartyId: string; instanceGuid: string },
) {
  return queryClient.ensureQueryData(instanceDataQueryOptions(params));
}

export function invalidateInstanceData(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: instanceQueryKeys.all() });
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useInstanceParams(): InstanceQueryParams {
  const instanceOwnerPartyId = useNavigationParam('instanceOwnerPartyId');
  const instanceGuid = useNavigationParam('instanceGuid');
  return { instanceOwnerPartyId, instanceGuid };
}

export function useInstanceData<R = IInstance>(select?: (instance: IInstance) => R) {
  const params = useInstanceParams();
  const query = useQuery({
    ...instanceDataQueryOptions(params),
    select,
  });
  return { data: query.data, error: query.error, isLoading: query.isLoading, refetch: query.refetch };
}

export function useInstanceDataElements(dataType: string | undefined) {
  const { data } = useInstanceData((instance) =>
    dataType ? instance.data.filter((d) => d.dataType === dataType) : instance.data,
  );
  return data ?? ([] as IData[]);
}

// ---------------------------------------------------------------------------
// Optimistic updates
// ---------------------------------------------------------------------------

export function useOptimisticInstanceUpdate() {
  const queryClient = useQueryClient();
  const params = useInstanceParams();
  const queryKey =
    params.instanceOwnerPartyId && params.instanceGuid ? instanceDataQueryOptions(params).queryKey : undefined;

  return (updater: (oldData: IInstance) => IInstance | undefined) => {
    if (queryKey) {
      queryClient.setQueryData(queryKey, (oldData: IInstance | undefined) => {
        if (!oldData) {
          throw new Error('Cannot update instance data cache when there is no cached data');
        }
        return updater(oldData);
      });
    }
  };
}
