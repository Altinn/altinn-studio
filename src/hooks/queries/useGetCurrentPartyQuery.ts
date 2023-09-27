import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/contexts/appQueriesContext';
import { PartyActions } from 'src/features/party/partySlice';
import { QueueActions } from 'src/features/queue/queueSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

export const useCurrentPartyQuery = (enabled: boolean) => {
  const dispatch = useAppDispatch();
  const parties = useAppSelector((state) => state.party.parties);

  const { fetchCurrentParty } = useAppQueries();
  return useQuery(['fetchUseCurrentParty'], fetchCurrentParty, {
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
      window.logError('Fetching current party failed:\n', error);
    },
  });
};
