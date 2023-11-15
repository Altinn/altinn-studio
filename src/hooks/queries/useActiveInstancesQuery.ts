import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { useAppQueries } from 'src/contexts/appQueriesContext';
import type { ISimpleInstance } from 'src/types';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

export const useActiveInstancesQuery = (partyId?: string, enabled?: boolean): UseQueryResult<ISimpleInstance[]> => {
  const { fetchActiveInstances } = useAppQueries();
  return useQuery({
    enabled,
    queryKey: ['getActiveInstances'],
    queryFn: async () => {
      const simpleInstances = await fetchActiveInstances(partyId || '');

      // Sort array by last changed date
      simpleInstances.sort((a, b) => new Date(a.lastChanged).getTime() - new Date(b.lastChanged).getTime());

      return simpleInstances;
    },
    onError: (error: HttpClientError) => {
      console.warn(error);
      throw new Error('Server did not return active instances');
    },
  });
};
