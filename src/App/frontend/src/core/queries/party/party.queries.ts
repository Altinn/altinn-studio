import { mutationOptions, queryOptions } from '@tanstack/react-query';

import { PartyApi } from 'src/core/api-client/party.api';

export const partyQueryKeys = {
  all: () => ['partyData'] as const,
  partiesAllowedToInstantiate: () => [...partyQueryKeys.all(), 'partiesAllowedToInstantiate'] as const,
};

export function partiesAllowedtoInstantiateQuery() {
  return queryOptions({
    queryKey: ['partiesAllowedToInstantiate'],
    queryFn: async () => await PartyApi.getPartiesAllowedToInstantiateHierarchical(),
  });
}

export function selectedPartyMutation(partyId: number | string) {
  return mutationOptions({
    mutationKey: ['setSelectedParty'],
    mutationFn: async () => await PartyApi.setSelectedParty({ partyId }),
    onError: (error: Error) => window.logError('Setting current party failed:\n', error),
  });
}
