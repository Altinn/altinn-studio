import { type QueryClient, useMutation, useQuery } from '@tanstack/react-query';

import { usePartyApi } from 'src/core/contexts/ApiProvider';
import { partiesAllowedToInstantiateQuery, selectedPartyMutation } from 'src/core/queries/party/party.queries';
import type { PartyApi } from 'src/core/api-client/party.api';
import type { BaseQueryResult } from 'src/core/queries/types';
import type { IParty } from 'src/types/shared';

interface UsePartiesAllowedToInstantiateResult extends BaseQueryResult {
  parties: IParty[] | undefined;
  isPending: boolean;
}

function usePartiesAllowedToInstantiate(options?: { enabled?: boolean }): UsePartiesAllowedToInstantiateResult {
  const query = useQuery(partiesAllowedToInstantiateQuery(usePartyApi(), options));
  return { parties: query.data, isLoading: query.isLoading, error: query.error, isPending: query.isPending };
}

function useSetSelectedParty() {
  const mutation = useMutation(selectedPartyMutation(usePartyApi()));
  return {
    setSelectedParty: mutation.mutate,
    setSelectedPartyAsync: mutation.mutateAsync,
    data: mutation.data,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

function prefetchPartiesAllowedToInstantiate({
  queryClient,
  partyApi,
}: {
  queryClient: QueryClient;
  partyApi: PartyApi;
}) {
  return queryClient.prefetchQuery(partiesAllowedToInstantiateQuery(partyApi));
}

export {
  partiesAllowedToInstantiateQuery,
  prefetchPartiesAllowedToInstantiate,
  usePartiesAllowedToInstantiate,
  useSetSelectedParty,
};
