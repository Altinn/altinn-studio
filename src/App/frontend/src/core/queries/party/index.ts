import { type QueryClient, useMutation, useQuery } from '@tanstack/react-query';

import { partiesAllowedToInstantiateQuery, selectedPartyMutation } from 'src/core/queries/party/party.queries';
import type { BaseQueryResult } from 'src/core/queries/types';
import type { IParty } from 'src/types/shared';

interface UsePartiesAllowedToInstantiateResult extends BaseQueryResult {
  parties: IParty[] | undefined;
  isPending: boolean;
}

function usePartiesAllowedToInstantiate(options?: { enabled?: boolean }): UsePartiesAllowedToInstantiateResult {
  const query = useQuery(partiesAllowedToInstantiateQuery(options));
  return { parties: query.data, isLoading: query.isLoading, error: query.error, isPending: query.isPending };
}

function useSetSelectedParty() {
  const mutation = useMutation(selectedPartyMutation());
  return {
    setSelectedParty: mutation.mutate,
    setSelectedPartyAsync: mutation.mutateAsync,
    data: mutation.data,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

function prefetchPartiesAllowedToInstantiate({ queryClient }: { queryClient: QueryClient }) {
  return queryClient.prefetchQuery(partiesAllowedToInstantiateQuery());
}

export {
  partiesAllowedToInstantiateQuery,
  prefetchPartiesAllowedToInstantiate,
  usePartiesAllowedToInstantiate,
  useSetSelectedParty,
};
