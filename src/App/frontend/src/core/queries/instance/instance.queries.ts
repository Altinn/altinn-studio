import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import { InstanceApi } from 'src/core/api-client/instance.api';
import { extractInstanceOwnerPartyIdAndInstanceGuidFromInstanceId } from 'src/core/queries/instance/utils';
import { removeProcessFromInstance } from 'src/features/instance/instanceUtils';
import type { Instantiation } from 'src/core/api-client/instance.api';

type InstantiationArgs = number | Instantiation;

interface InstanceQueryParams {
  instanceOwnerPartyId: string;
  instanceGuid: string;
}

export const instanceQueryKeys = {
  all: () => ['instanceData'] as const,
  instance: ({ instanceOwnerPartyId, instanceGuid }: InstanceQueryParams) =>
    [...instanceQueryKeys.all(), { instanceOwnerPartyId, instanceGuid }] as const,
  active: (partyId: string) => [...instanceQueryKeys.all(), 'active', partyId] as const,
};

export function instanceDataQuery({ instanceOwnerPartyId, instanceGuid }: InstanceQueryParams) {
  return queryOptions({
    queryKey: instanceQueryKeys.instance({ instanceOwnerPartyId, instanceGuid }),
    queryFn: async () => {
      try {
        const instance = await InstanceApi.getInstance({ instanceOwnerPartyId, instanceGuid });
        return removeProcessFromInstance(instance);
      } catch (error) {
        window.logError('Fetching instance data failed:\n', error);
        throw error;
      }
    },
  });
}

export function activeInstancesQuery(partyId: string) {
  return queryOptions({
    queryKey: instanceQueryKeys.active(partyId),
    queryFn: () => InstanceApi.getActiveInstances({ partyId }),
  });
}

export function useCreateInstance(language: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['instantiate'],
    mutationFn: (args: InstantiationArgs) =>
      typeof args === 'number'
        ? InstanceApi.create({ instanceOwnerPartyId: args, language })
        : InstanceApi.createWithPrefill({ data: args, language }),
    onError: (error) => {
      window.logError('Instantiation failed:\n', error);
    },
    onSuccess: (data) => {
      const { instanceOwnerPartyId, instanceGuid } = extractInstanceOwnerPartyIdAndInstanceGuidFromInstanceId(data.id);
      const queryKey = instanceQueryKeys.instance({ instanceOwnerPartyId, instanceGuid });
      queryClient.setQueryData(queryKey, removeProcessFromInstance(data));
    },
  });
}
