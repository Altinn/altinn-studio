import { useCallback, useMemo, useState } from 'react';

import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';

import { useInstanceApi } from 'src/core/contexts/ApiProvider';
import { instanceDataQuery, instanceQueryKeys } from 'src/core/queries/instance/instance.queries';
import { useNavigationParam } from 'src/hooks/navigation';
import type { IInstance } from 'src/types/shared';

export function useInstancePollFailureCount(): number {
  const { isError, errorUpdateCount, dataUpdatedAt } = useInstanceQueryInternal();

  // Baseline the (monotonic) error count at the moment of the last successful fetch, so the
  // difference counts consecutive failures only. Any successful data write — a poll tick, a
  // mutation refetch, an optimistic setQueryData — bumps dataUpdatedAt and resets the baseline.
  const [baseline, setBaseline] = useState({ dataUpdatedAt, errorUpdateCount });
  if (baseline.dataUpdatedAt !== dataUpdatedAt) {
    setBaseline({ dataUpdatedAt, errorUpdateCount });
  }

  return isError ? errorUpdateCount - baseline.errorUpdateCount : 0;
}

export function useInstanceDataQueryArgs() {
  const instanceOwnerPartyId = useNavigationParam('instanceOwnerPartyId');
  const instanceGuid = useNavigationParam('instanceGuid');

  return { instanceOwnerPartyId, instanceGuid };
}

interface InstanceReadOptions<R> {
  enabled?: boolean;
  select?: (instance: IInstance) => R;
  pollIntervalMs?: number | false;
  refreshWhenFocused?: boolean;
}

export function useInstanceQueryInternal<R = IInstance>(queryOptions: InstanceReadOptions<R> = {}) {
  const instanceApi = useInstanceApi();
  const { instanceOwnerPartyId, instanceGuid } = useInstanceDataQueryArgs();
  const hasParams = !!instanceOwnerPartyId && !!instanceGuid;

  return useQuery<IInstance, Error, R>({
    ...(hasParams
      ? instanceDataQuery({ instanceOwnerPartyId, instanceGuid, instanceApi })
      : {
          queryKey: [...instanceQueryKeys.all(), { instanceOwnerPartyId, instanceGuid }] as const,
          queryFn: skipToken,
        }),
    refetchOnWindowFocus: queryOptions.refreshWhenFocused ?? !!queryOptions.pollIntervalMs,
    refetchInterval: queryOptions.pollIntervalMs,
    enabled: queryOptions.enabled,
    select: queryOptions.select, // FIXME: somehow TS complains if this is not here
  });
}

export function useInvalidateInstanceDataCache() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: instanceQueryKeys.all() });
}

export const useSelectFromInstanceData = () => {
  const queryClient = useQueryClient();
  const { instanceOwnerPartyId, instanceGuid } = useInstanceDataQueryArgs();
  const instanceQueryKey = useMemo(
    () =>
      instanceOwnerPartyId && instanceGuid
        ? instanceQueryKeys.instance({ instanceOwnerPartyId, instanceGuid })
        : undefined,
    [instanceOwnerPartyId, instanceGuid],
  );

  return useCallback(
    <T>(selector: (instance: IInstance) => T): T | undefined => {
      const instance = instanceQueryKey ? queryClient.getQueryData<IInstance>(instanceQueryKey) : undefined;
      return instance ? selector(instance) : undefined;
    },
    [instanceQueryKey, queryClient],
  );
};

export function useInstanceDataQuery<R = IInstance>(options: InstanceReadOptions<R> = {}) {
  const { data, error, refetch: refresh } = useInstanceQueryInternal(options);
  const refetch = useCallback(async () => {
    const { data, error } = await refresh();
    return { data, error };
  }, [refresh]);
  return { data, error, refetch };
}
