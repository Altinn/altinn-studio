import { queryOptions } from '@tanstack/react-query';
import { PartiesApi } from 'nextsrc/core/apiClient/partiesApi';

export const partyQueries = {
  all: ['parties'] as const,
  userParty: (userPartyId: string) => [...partyQueries.all, { userPartyId }],
  selectedParty: (selectedPartyId: string) => [...partyQueries.all, { selectedPartyId }],
  allowedToInstantiate: () => [...partyQueries.all, 'allowedToInstantiate'],
};

export function partiesAllowedToInstantiateQuery() {
  return queryOptions({
    queryKey: partyQueries.allowedToInstantiate(),
    queryFn: PartiesApi.getPartiesAllowedToInstantiate,
  });
}
