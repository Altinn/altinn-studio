import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/contexts/appQueriesContext';
import { PartyActions } from 'src/features/party/partySlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

export const usePartiesQuery = (enabled: boolean) => {
  const dispatch = useAppDispatch();

  const { fetchParties } = useAppQueries();
  return useQuery(['fetchUseParties'], fetchParties, {
    enabled,
    onSuccess: (parties) => {
      // Update the Redux Store ensures that legacy code has access to the data without using the Tanstack Query Cache
      dispatch(PartyActions.getPartiesFulfilled({ parties }));
    },
    onError: (error: HttpClientError) => {
      // Update the Redux Store ensures that legacy code has access to the data without using the Tanstack Query Cache
      window.logError('Fetching parties failed:\n', error);
    },
  });
};
