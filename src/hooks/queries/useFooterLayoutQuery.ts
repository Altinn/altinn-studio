import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { useAppQueries } from 'src/contexts/appQueriesContext';
import { FooterLayoutActions } from 'src/features/footer/data/footerLayoutSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import type { IFooterLayout } from 'src/features/footer/types';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

export const useFooterLayoutQuery = (enabled?: boolean): UseQueryResult<IFooterLayout> => {
  const dispatch = useAppDispatch();
  const { fetchFooterLayout } = useAppQueries();
  return useQuery(['fetchFooterLayout'], fetchFooterLayout, {
    enabled,
    onSuccess: (footerLayout) => {
      // Update the Redux Store ensures that legacy code has access to the data without using the Tanstack Query Cache
      dispatch(FooterLayoutActions.fetchFulfilled({ footerLayout }));
    },
    onError: (error: HttpClientError) => {
      // Update the Redux Store ensures that legacy code has access to the data without using the Tanstack Query Cache
      dispatch(FooterLayoutActions.fetchRejected({ error }));
      window.logError('Fetching footer failed:\n', error);
    },
  });
};
