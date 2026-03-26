import { mutationOptions, queryOptions } from '@tanstack/react-query';

import { PartyApi } from 'src/core/api-client/party.api';

export const partyQueryKeys = {
  all: () => ['partyData'] as const,
  partiesAllowedToInstantiate: () => [...partyQueryKeys.all(), 'partiesAllowedToInstantiate'] as const,
};

export function partiesAllowedToInstantiateQuery(options?: { enabled?: boolean }) {
  return queryOptions({
    queryKey: partyQueryKeys.partiesAllowedToInstantiate(),
    queryFn: () => PartyApi.getPartiesAllowedToInstantiateHierarchical(),
    ...options,
  });
}

export function selectedPartyMutation() {
  return mutationOptions({
    mutationKey: ['setSelectedParty'],
    mutationFn: ({ partyId }: { partyId: number | string }) => PartyApi.setSelectedParty({ partyId }),
    onError: (error: Error) => window.logError('Setting current party failed:\n', error),
  });
}
