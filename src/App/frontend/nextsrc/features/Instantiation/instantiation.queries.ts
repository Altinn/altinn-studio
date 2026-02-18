import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { InstanceApi } from 'nextsrc/core/apiClient/instanceApi';
import { PartiesApi } from 'nextsrc/core/apiClient/partiesApi';
import { GlobalData } from 'nextsrc/core/globalData';
import { extractInstanceOwnerPartyIdAndInstanceGuidFromInstanceId } from 'nextsrc/core/queries/instance/utils';

export const instantiationQueries = {
  all: ['instantiation'] as const,
  allInstances: (instanceOwnerPartyId: string) => [...instantiationQueries.all, 'instances', instanceOwnerPartyId],
  activeInstances: (instanceOwnerPartyId: string) => [
    ...instantiationQueries.allInstances(instanceOwnerPartyId),
    instanceOwnerPartyId,
    'active',
  ],
  currentInstance: ({ instanceOwnerPartyId, instanceGuid }: { instanceOwnerPartyId: string; instanceGuid: string }) => [
    ...instantiationQueries.allInstances(instanceOwnerPartyId),
    { instanceGuid },
  ],
  allParties: () => [...instantiationQueries.all, 'parties'],
  userParty: (userPartyId: string) => [...instantiationQueries.allParties(), { userPartyId }],
  selectedParty: ({ userPartyId, selectedPartyId }: { userPartyId: string; selectedPartyId: string }) => [
    ...instantiationQueries.userParty(userPartyId),
    { selectedPartyId },
  ],
  allowedToInstantiateParties: (userPartyId: string) => [
    ...instantiationQueries.userParty(userPartyId),
    'allowedToInstantiate',
  ],
};

export const activeInstancesQuery = (instanceOwnerPartyId: string) =>
  queryOptions({
    queryKey: instantiationQueries.activeInstances(instanceOwnerPartyId),
    queryFn: () => InstanceApi.getActiveInstances(instanceOwnerPartyId),
    staleTime: 1000 * 60,
  });

export const useActiveInstances = ({
  instanceOwnerPartyId,
  sortDirection,
}: {
  instanceOwnerPartyId: string;
  sortDirection: 'desc' | 'asc';
}) =>
  useQuery({
    ...activeInstancesQuery(instanceOwnerPartyId),
    select: (instances) => (sortDirection === 'desc' ? [...instances].reverse() : instances),
  });

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

      const instanceQueryKey = instantiationQueries.currentInstance({ instanceOwnerPartyId, instanceGuid });
      queryClient.setQueryData(instanceQueryKey, newInstance);
      queryClient.invalidateQueries({ queryKey: instanceQueryKey });
    },
  });
}

export function partiesAllowedToInstantiateQuery(userPartyId: string) {
  return queryOptions({
    queryKey: instantiationQueries.allowedToInstantiateParties(userPartyId),
    queryFn: PartiesApi.getPartiesAllowedToInstantiate,
  });
}
