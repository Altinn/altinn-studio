import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { useAppQueriesContext } from 'src/contexts/appQueriesContext';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import type { ILayoutSets } from 'src/types';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

enum ServerStateCacheKey {
  LayoutSets = 'fetchLayoutSets',
}
export const useLayoutSetsQuery = (): UseQueryResult<ILayoutSets> => {
  const dispatch = useAppDispatch();
  const { fetchLayoutSets } = useAppQueriesContext();
  return useQuery([ServerStateCacheKey.LayoutSets], fetchLayoutSets, {
    onSuccess: (layoutSets) => {
      // Update the Redux Store ensures that legacy code has access to the data without using the Tanstack Query Cache
      dispatch(FormLayoutActions.fetchSetsFulfilled({ layoutSets }));
    },
    onError: (error: HttpClientError) => {
      // Update the Redux Store ensures that legacy code has access to the data without using the Tanstack Query Cache
      dispatch(FormLayoutActions.fetchSetsRejected({ error }));
    },
  });
};
