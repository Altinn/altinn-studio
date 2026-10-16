import { useMutation, useQuery } from '@tanstack/react-query';

import { usePartyApi } from 'src/core/contexts/ApiProvider';
import { partiesAllowedToInstantiateQuery, selectedPartyMutation } from 'src/core/queries/party/party.queries';
import { PartyPrefetcher } from 'src/core/queries/party/PartyPrefetcher';
import { getQueryClient } from 'src/core/queries/queryClient.queries';
import type { PartyApi } from 'src/core/api-client/party.api';
import type { AppQueryClient } from 'src/core/queries/queryClient';
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
  const setSelectedParty: (args: { partyId: number | string }) => void = mutation.mutate;
  const setSelectedPartyAsync: (args: {
    partyId: number | string;
  }) => Promise<Awaited<ReturnType<PartyApi['setSelectedParty']>>> = mutation.mutateAsync;
  return {
    setSelectedParty,
    setSelectedPartyAsync,
    data: mutation.data,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

function prefetchPartiesAllowedToInstantiate({
  queryClient,
  partyApi,
}: {
  queryClient: AppQueryClient;
  partyApi: PartyApi;
}) {
  return getQueryClient(queryClient).prefetchQuery(partiesAllowedToInstantiateQuery(partyApi));
}

export { PartyPrefetcher, prefetchPartiesAllowedToInstantiate, usePartiesAllowedToInstantiate, useSetSelectedParty };
