import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { OrgsActions } from 'src/features/orgs/orgsSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import type { IAltinnOrgs } from 'src/types/shared';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

const extractOrgsFromServerResponse = (response: { orgs: IAltinnOrgs }): IAltinnOrgs => response.orgs;

const useOrgsQuery = () => {
  const dispatch = useAppDispatch();
  const { fetchOrgs } = useAppQueries();
  return useQuery({
    queryKey: ['fetchOrganizations'],
    queryFn: () => fetchOrgs().then(extractOrgsFromServerResponse),
    onSuccess: (orgs) => {
      dispatch(OrgsActions.fetchFulfilled({ orgs }));
    },
    onError: (error: HttpClientError) => {
      window.logError('Fetching organizations failed:\n', error);
    },
  });
};

const { Provider, useCtx, useHasProvider } = delayedContext(() =>
  createQueryContext({
    name: 'Orgs',
    required: true,
    query: useOrgsQuery,
  }),
);

export const OrgsProvider = Provider;
export const useOrgs = () => useCtx();
export const useHasOrgs = () => useHasProvider();
