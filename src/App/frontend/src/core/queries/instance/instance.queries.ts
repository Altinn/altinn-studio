import { useCallback } from 'react';

import { queryOptions, replaceEqualDeep, useMutation, useQueryClient } from '@tanstack/react-query';

import { useInstanceApi } from 'src/core/contexts/ApiProvider';
import { parseInstanceId } from 'src/core/queries/instance';
import { maybeAuthenticationRedirect } from 'src/utils/maybeAuthenticationRedirect';
import type { InstanceApi, Instantiation } from 'src/core/api-client/instance.api';
import type { IInstance } from 'src/types/shared';

type InstantiationArgs = number | Instantiation;

interface InstanceQueryKeys {
  instanceOwnerPartyId: string;
  instanceGuid: string;
}

interface InstanceQueryParams extends InstanceQueryKeys {
  instanceApi: InstanceApi;
}

interface ActiveInstancesQueryParams {
  partyId: string;
  instanceApi: InstanceApi;
}

export const instanceQueryKeys = {
  all: () => ['instanceData'] as const,
  instance: ({ instanceOwnerPartyId, instanceGuid }: InstanceQueryKeys) =>
    [...instanceQueryKeys.all(), { instanceOwnerPartyId, instanceGuid }] as const,
  active: (partyId: string) => [...instanceQueryKeys.all(), 'active', partyId] as const,
};

/**
 * Refuses to let a stale instance response regress the cache. An instance read that raced a
 * process mutation can be delivered AFTER the mutation's own result was written (its content was
 * decided server-side before the transition committed), resurrecting the pre-transition process
 * state — observed as a reject's result being overwritten by the superseded failed state, sending
 * navigation backwards and stranding the session. `process.currentTask.flow` is a monotone
 * counter and `ended` is terminal, so a write that regresses either is stale by definition and
 * keeps the existing data instead. Applied as `structuralSharing`, which guards every write to
 * the entry: fetch results, polls, and setQueryData alike.
 */
export function preferFreshestInstanceData(oldData: unknown, newData: unknown): unknown {
  const oldInstance = oldData as IInstance | undefined;
  const newInstance = newData as IInstance | undefined;

  const oldFlow = oldInstance?.process?.currentTask?.flow;
  const newFlow = newInstance?.process?.currentTask?.flow;
  const regressesFlow = oldFlow !== undefined && newFlow !== undefined && newFlow < oldFlow;
  const regressesEnded = !!oldInstance?.process?.ended && !!newInstance && !newInstance.process?.ended;

  if (oldInstance && (regressesFlow || regressesEnded)) {
    return oldInstance;
  }

  return replaceEqualDeep(oldData, newData);
}

export function instanceDataQuery({ instanceOwnerPartyId, instanceGuid, instanceApi }: InstanceQueryParams) {
  return queryOptions({
    queryKey: instanceQueryKeys.instance({ instanceOwnerPartyId, instanceGuid }),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    queryFn: () => instanceApi.getInstance({ instanceOwnerPartyId, instanceGuid }),
    // Cache is canonical; refresh is explicit via mutations, poll-driven setQueryData,
    // or invalidateQueries. Prevents the route loader from refetching on every URL change
    // and prevents transient cache-vs-URL mismatches in ProcessWrapper.
    staleTime: Infinity,
    structuralSharing: preferFreshestInstanceData,
  });
}

export function activeInstancesQuery({ partyId, instanceApi }: ActiveInstancesQueryParams) {
  return queryOptions({
    queryKey: instanceQueryKeys.active(partyId),
    queryFn: () => instanceApi.getActiveInstances({ partyId }),
  });
}

export function useGetCachedInstanceData() {
  const queryClient = useQueryClient();
  return useCallback(
    (instanceOwnerPartyId: string | undefined, instanceGuid: string | undefined): IInstance | undefined =>
      instanceOwnerPartyId && instanceGuid
        ? queryClient.getQueryData<IInstance>(instanceQueryKeys.instance({ instanceOwnerPartyId, instanceGuid }))
        : undefined,
    [queryClient],
  );
}

export function useCreateInstance(language: string) {
  const queryClient = useQueryClient();
  const instanceApi = useInstanceApi();

  return useMutation({
    mutationKey: ['instantiate'],
    mutationFn: (args: InstantiationArgs) =>
      typeof args === 'number'
        ? instanceApi.create({ instanceOwnerPartyId: args, language })
        : instanceApi.createWithPrefill({ data: args, language }),
    onError: async (error) => {
      window.logError('Instantiation failed:\n', error);

      // If the instantiation failed because the user is authenticated with a too low security level, the backend
      // responds with 403 and a RequiredAuthenticationLevel. We then redirect to step-up authentication instead of
      // falling through to a generic "missing roles" error page. No-op for any other error.
      await maybeAuthenticationRedirect(error);
    },
    onSuccess: (data) => {
      const { instanceOwnerPartyId, instanceGuid } = parseInstanceId(data.id);
      queryClient.setQueryData(instanceQueryKeys.instance({ instanceOwnerPartyId, instanceGuid }), data);
    },
  });
}
