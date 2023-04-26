import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { useAppQueriesContext } from 'src/contexts/appQueriesContext';
import { FooterLayoutActions } from 'src/features/footer/data/footerLayoutSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import type { IFooterLayout } from 'src/features/footer/types';
import type { AppDispatch } from 'src/redux/store';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

const handleErrorAsSuccessful = (dispatch: AppDispatch): void => {
  dispatch(FooterLayoutActions.fetchFulfilled({ footerLayout: null }));
};

enum ServerStateCacheKey {
  FetchFooterLayout = 'fetchFooterLayout',
}

export const useFooterLayoutQuery = (enabled?: boolean): UseQueryResult<IFooterLayout> => {
  const dispatch = useAppDispatch();
  const { fetchFooterLayout } = useAppQueriesContext();
  return useQuery([ServerStateCacheKey.FetchFooterLayout], fetchFooterLayout, {
    enabled,
    onSuccess: (footerLayout) => {
      // Update the Redux Store ensures that legacy code has access to the data without using the Tanstack Query Cache
      dispatch(FooterLayoutActions.fetchFulfilled({ footerLayout }));
    },
    onError: (error: HttpClientError) => {
      // 404 is a valid response for this query, so we handle it as a successful response. TODO rewrite the backend to return 204 instead of 404.
      const errorStatusCodeToBeTreatedAsOK = [404];
      if (errorStatusCodeToBeTreatedAsOK.includes(error?.response?.status || 0)) {
        handleErrorAsSuccessful(dispatch);
        return;
      }
      // Update the Redux Store ensures that legacy code has access to the data without using the Tanstack Query Cache
      dispatch(FooterLayoutActions.fetchRejected({ error }));
    },
  });
};
