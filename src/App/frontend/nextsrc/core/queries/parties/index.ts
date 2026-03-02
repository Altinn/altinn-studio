import { useQuery } from '@tanstack/react-query';
import { partiesAllowedToInstantiateQuery, partyQueryKeys } from 'nextsrc/core/queries/parties/parties.queries';
import type { OmitKeyof, QueryClient, UseQueryOptions } from '@tanstack/react-query';

import type { IParty } from 'src/types/shared';

function invalidatePartyQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: partyQueryKeys.all });
}

function usePartiesAllowedToInstantiate(
  queryOptions?: OmitKeyof<UseQueryOptions<IParty[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({ ...partiesAllowedToInstantiateQuery, ...queryOptions });
}

export { invalidatePartyQueries, partiesAllowedToInstantiateQuery, usePartiesAllowedToInstantiate };
