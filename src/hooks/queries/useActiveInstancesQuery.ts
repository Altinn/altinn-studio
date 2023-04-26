import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { useAppQueriesContext } from 'src/contexts/appQueriesContext';
import { InstanceDataActions } from 'src/features/instanceData/instanceDataSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import type { ISimpleInstance } from 'src/types';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

enum ServerStateCacheKey {
  GetActiveInstances = 'getActiveInstances',
}

export const useActiveInstancesQuery = (partyId?: string, enabled?: boolean): UseQueryResult<ISimpleInstance[]> => {
  const dispatch = useAppDispatch();
  const { fetchActiveInstances } = useAppQueriesContext();
  return useQuery([ServerStateCacheKey.GetActiveInstances], () => fetchActiveInstances(partyId || ''), {
    enabled,
    onSuccess: (instanceData) => {
      dispatch(InstanceDataActions.getFulfilled({ instanceData }));
    },
    onError: (error: HttpClientError) => {
      console.warn(error);
      throw new Error('Server did not return active instances');
    },
  });
};
