import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { useAppQueries } from 'src/contexts/appQueriesContext';
import { InstanceDataActions } from 'src/features/instanceData/instanceDataSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import type { ISimpleInstance } from 'src/types';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

export const useActiveInstancesQuery = (partyId?: string, enabled?: boolean): UseQueryResult<ISimpleInstance[]> => {
  const dispatch = useAppDispatch();
  const { fetchActiveInstances } = useAppQueries();
  return useQuery(['getActiveInstances'], () => fetchActiveInstances(partyId || ''), {
    enabled,
    onSuccess: (instanceData) => {
      // Sort array by last changed date
      instanceData.sort((a, b) => new Date(a.lastChanged).getTime() - new Date(b.lastChanged).getTime());

      dispatch(InstanceDataActions.getFulfilled({ instanceData }));
    },
    onError: (error: HttpClientError) => {
      console.warn(error);
      throw new Error('Server did not return active instances');
    },
  });
};
