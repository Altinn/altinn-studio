import { useQuery } from '@tanstack/react-query';
import { partiesAllowedToInstantiateQuery, partyQueryKeys } from 'nextsrc/core/queries/parties/parties.queries';
import type { QueryClient } from '@tanstack/react-query';

import type { IParty } from 'src/types/shared';

interface UsePartiesAllowedToInstantiateResult {
  parties: IParty[] | undefined;
  isLoading: boolean;
  error: Error | null;
}

function usePartiesAllowedToInstantiate(): UsePartiesAllowedToInstantiateResult {
  const query = useQuery(partiesAllowedToInstantiateQuery);
  return { parties: query.data, isLoading: query.isLoading, error: query.error };
}

function prefetchPartiesAllowedToInstantiate(queryClient: QueryClient) {
  return queryClient.ensureQueryData(partiesAllowedToInstantiateQuery);
}

function invalidatePartyQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: partyQueryKeys.all });
}

export { invalidatePartyQueries, prefetchPartiesAllowedToInstantiate, usePartiesAllowedToInstantiate };
