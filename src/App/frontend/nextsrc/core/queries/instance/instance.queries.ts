import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { InstanceApi } from 'nextsrc/core/apiClient/instanceApi';
import { GlobalData } from 'nextsrc/core/globalData';
import { extractInstanceOwnerPartyIdAndInstanceGuidFromInstanceId } from 'nextsrc/core/queries/instance/utils';

const instanceQueries = {
  all: (instanceOwnerPartyId: string) => ['instances', instanceOwnerPartyId] as const,
  active: (instanceOwnerPartyId: string) => [...instanceQueries.all(instanceOwnerPartyId), 'active'] as const,
  current: ({ instanceOwnerPartyId, instanceGuid }: { instanceOwnerPartyId: string; instanceGuid: string }) =>
    [...instanceQueries.all(instanceOwnerPartyId), instanceGuid] as const,
};

export function activeInstancesQuery(instanceOwnerPartyId: string) {
  return queryOptions({
    queryKey: instanceQueries.active(instanceOwnerPartyId),
    queryFn: () => InstanceApi.getActiveInstances(instanceOwnerPartyId),
    staleTime: 1000 * 60,
  });
}

export function useCreateInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const selectedPartyId = GlobalData.selectedParty?.partyId;
      if (!selectedPartyId) {
        throw new Error('No selected party');
      }
      return InstanceApi.create(selectedPartyId);
    },
    onSuccess: (newInstance) => {
      const { instanceOwnerPartyId, instanceGuid } = extractInstanceOwnerPartyIdAndInstanceGuidFromInstanceId(
        newInstance.id,
      );

      const instanceQueryKey = instanceQueries.current({ instanceOwnerPartyId, instanceGuid });
      queryClient.setQueryData(instanceQueryKey, newInstance);
      queryClient.invalidateQueries({ queryKey: instanceQueryKey });
    },
  });
}
