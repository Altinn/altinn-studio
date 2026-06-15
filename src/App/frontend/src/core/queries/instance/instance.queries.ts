import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import { useInstanceApi } from 'src/core/contexts/ApiProvider';
import { parseInstanceId } from 'src/core/queries/instance/utils';
import type { InstanceApi, Instantiation } from 'src/core/api-client/instance.api';

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
  });
}

export function activeInstancesQuery({ partyId, instanceApi }: ActiveInstancesQueryParams) {
  return queryOptions({
    queryKey: instanceQueryKeys.active(partyId),
    queryFn: () => instanceApi.getActiveInstances({ partyId }),
  });
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
    onError: (error) => {
      window.logError('Instantiation failed:\n', error);
    },
    onSuccess: (data) => {
      const { instanceOwnerPartyId, instanceGuid } = parseInstanceId(data.id);
      queryClient.setQueryData(instanceQueryKeys.instance({ instanceOwnerPartyId, instanceGuid }), data);
    },
  });
}
