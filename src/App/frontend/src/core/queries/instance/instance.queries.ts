import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import { InstanceApi } from 'src/core/api-client/instance.api';
import { extractInstanceOwnerPartyIdAndInstanceGuidFromInstanceId } from 'src/core/queries/instance/utils';
import { removeProcessFromInstance } from 'src/features/instance/instanceUtils';
import type { Instantiation } from 'src/features/instantiate/useInstantiation';

type InstantiationArgs = number | Instantiation;

export const instanceQueries = {
  all: () => ['instanceData'] as const,
  instanceData: ({ instanceOwnerPartyId, instanceGuid }: { instanceOwnerPartyId: string; instanceGuid: string }) =>
    queryOptions({
      queryKey: [...instanceQueries.all(), { instanceOwnerPartyId, instanceGuid }] as const,
      queryFn: async () => {
        try {
          const instance = await InstanceApi.getInstance({ instanceOwnerPartyId, instanceGuid });
          return removeProcessFromInstance(instance);
        } catch (error) {
          window.logError('Fetching instance data failed:\n', error);
          throw error;
        }
      },
    }),
  active: (partyId: string) => [...instanceQueries.all(), 'active', partyId] as const,
};

export function activeInstancesQuery(partyId: string) {
  return queryOptions({
    queryKey: instanceQueries.active(partyId),
    queryFn: () => InstanceApi.getActiveInstances(partyId),
  });
}

export function useCreateInstance(language: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['instantiate'],
    mutationFn: (args: InstantiationArgs) =>
      typeof args === 'number' ? InstanceApi.create(args, language) : InstanceApi.createWithPrefill(args, language),
    onError: (error) => {
      window.logError('Instantiation failed:\n', error);
    },
    onSuccess: (data) => {
      const { instanceOwnerPartyId, instanceGuid } = extractInstanceOwnerPartyIdAndInstanceGuidFromInstanceId(data.id);
      const queryKey = instanceQueries.instanceData({ instanceOwnerPartyId, instanceGuid }).queryKey;
      queryClient.setQueryData(queryKey, removeProcessFromInstance(data));
    },
  });
}
