import { mutationOptions, queryOptions } from '@tanstack/react-query';

import type { PartyApi } from 'src/core/api-client/party.api';

export const partyQueryKeys = {
  all: () => ['partyData'] as const,
  partiesAllowedToInstantiate: () => [...partyQueryKeys.all(), 'partiesAllowedToInstantiate'] as const,
};

export function partiesAllowedToInstantiateQuery(partyApi: PartyApi, options?: { enabled?: boolean }) {
  return queryOptions({
    queryKey: partyQueryKeys.partiesAllowedToInstantiate(),
    queryFn: () => partyApi.getPartiesAllowedToInstantiateHierarchical(),
    ...options,
  });
}

export function selectedPartyMutation(partyApi: PartyApi) {
  return mutationOptions({
    mutationKey: ['setSelectedParty'],
    mutationFn: ({ partyId }: { partyId: number | string }) => partyApi.setSelectedParty({ partyId }),
    onError: (error: Error) => window.logError('Setting current party failed:\n', error),
  });
}
