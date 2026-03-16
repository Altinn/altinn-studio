import { queryOptions, skipToken, useMutation, useMutationState, useQueryClient } from '@tanstack/react-query';

import { InstanceApi } from 'src/core/api-client/instance.api';

export interface InstanceQueryParams {
  instanceOwnerPartyId: string | undefined;
  instanceGuid: string | undefined;
}

export const instanceQueryKeys = {
  all: () => ['instanceData'] as const,
  instance: ({ instanceOwnerPartyId, instanceGuid }: InstanceQueryParams) =>
    [...instanceQueryKeys.all(), { instanceOwnerPartyId, instanceGuid }] as const,
  activeInstances: (partyId: number | undefined) => ['activeInstances', partyId] as const,
};

export function instanceDataQueryOptions({ instanceOwnerPartyId, instanceGuid }: InstanceQueryParams) {
  return queryOptions({
    queryKey: instanceQueryKeys.instance({ instanceOwnerPartyId, instanceGuid }),
    queryFn:
      !instanceOwnerPartyId || !instanceGuid
        ? skipToken
        : async () => {
            try {
              return await InstanceApi.getInstance({ instanceOwnerPartyId, instanceGuid });
            } catch (error) {
              window.logError('Fetching instance data failed:\n', error);
              throw error;
            }
          },
    refetchIntervalInBackground: false,
  });
}

export function activeInstancesQueryOptions(partyId: number | undefined) {
  return queryOptions({
    queryKey: instanceQueryKeys.activeInstances(partyId),
    queryFn: partyId == null ? skipToken : () => InstanceApi.getActiveInstances(partyId),
    staleTime: 1000 * 60,
  });
}

export function useCreateInstanceMutation() {
  const queryClient = useQueryClient();

  const { mutateAsync } = useMutation({
    mutationKey: ['instantiate'],
    mutationFn: async ({ instanceOwnerPartyId, language }: { instanceOwnerPartyId: number; language?: string }) =>
      InstanceApi.create(instanceOwnerPartyId, language),
    onError: (error) => {
      window.logError('Instantiation failed:\n', error);
    },
    onSuccess: (newInstance) => {
      const [instanceOwnerPartyId, instanceGuid] = newInstance.id.split('/');
      const queryKey = instanceQueryKeys.instance({ instanceOwnerPartyId, instanceGuid });
      queryClient.setQueryData(queryKey, newInstance);
    },
  });

  const mutations = useMutationState({ filters: { mutationKey: ['instantiate'] } });
  const hasAlreadyInstantiated = mutations.length > 0;
  const lastMutation = mutations.at(-1);

  return { mutateAsync, hasAlreadyInstantiated, lastMutation };
}
