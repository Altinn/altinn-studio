import { useQuery } from '@tanstack/react-query';

import { useAppQueriesContext } from 'src/contexts/appQueriesContext';
import { PartyActions } from 'src/features/party/partySlice';
import { QueueActions } from 'src/features/queue/queueSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

enum ServerStateCacheKey {
  UseParties = 'fetchUseParties',
}

export const usePartiesQuery = (enabled: boolean) => {
  const dispatch = useAppDispatch();

  const { fetchParties } = useAppQueriesContext();
  return useQuery([ServerStateCacheKey.UseParties], fetchParties, {
    enabled,
    onSuccess: (parties) => {
      // Update the Redux Store ensures that legacy code has access to the data without using the Tanstack Query Cache
      dispatch(PartyActions.getPartiesFulfilled({ parties }));
    },
    onError: (error: HttpClientError) => {
      // Update the Redux Store ensures that legacy code has access to the data without using the Tanstack Query Cache
      dispatch(QueueActions.userTaskQueueError({ error }));
    },
  });
};
