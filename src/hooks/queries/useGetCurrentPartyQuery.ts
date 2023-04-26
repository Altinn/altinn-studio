import { useQuery } from '@tanstack/react-query';

import { useAppQueriesContext } from 'src/contexts/appQueriesContext';
import { PartyActions } from 'src/features/party/partySlice';
import { QueueActions } from 'src/features/queue/queueSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

enum ServerStateCacheKey {
  UseCurrentParty = 'fetchUseCurrentParty',
}

export const useCurrentPartyQuery = (enabled: boolean) => {
  const dispatch = useAppDispatch();
  const parties = useAppSelector((state) => state.party.parties);

  const { fetchCurrentParty } = useAppQueriesContext();
  return useQuery([ServerStateCacheKey.UseCurrentParty], fetchCurrentParty, {
    enabled,
    onSuccess: (currentParty) => {
      // Update the Redux Store ensures that legacy code has access to the data without using the Tanstack Query Cache
      dispatch(PartyActions.selectPartyFulfilled({ party: currentParty }));
      if (!parties || parties.length === 0) {
        dispatch(PartyActions.getPartiesFulfilled({ parties: [currentParty] }));
      }
    },
    onError: (error: HttpClientError) => {
      // Update the Redux Store ensures that legacy code has access to the data without using the Tanstack Query Cache
      dispatch(QueueActions.userTaskQueueError({ error }));
    },
  });
};
