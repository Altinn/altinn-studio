import { useMutation, useQuery } from '@tanstack/react-query';

import { partiesAllowedtoInstantiateQuery, selectedPartyMutation } from 'src/core/queries/party/party.queries';
import type { BaseQueryResult } from 'src/core/queries/types';
import type { IParty } from 'src/types/shared';

interface UsePartiesAllowedToInstantiateResult extends BaseQueryResult {
  parties: IParty[] | undefined;
}

function usePartiesAllowedToInstantiate(): UsePartiesAllowedToInstantiateResult {
  const query = useQuery(partiesAllowedtoInstantiateQuery());
  return { parties: query.data, isLoading: query.isLoading, error: query.error };
}

function useSetSelectedParty({ partyId }: { partyId: number | string }) {
  const mutation = useMutation(selectedPartyMutation(partyId));
  return {
    setSelectedParty: mutation.mutate,
    setSelectedPartyAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

export { usePartiesAllowedToInstantiate, useSetSelectedParty };
