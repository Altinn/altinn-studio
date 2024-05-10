import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';

export const useOrderDetailsQuery = (partyId?: string, instanceGuid?: string) => {
  const { fetchOrderDetails } = useAppQueries();
  return useQuery({
    queryKey: ['fetchOrderDetails'],
    queryFn: () => {
      if (partyId && instanceGuid) {
        return fetchOrderDetails(partyId, instanceGuid);
      }
    },
    enabled: !!partyId && !!instanceGuid,
  });
};
