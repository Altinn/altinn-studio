import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { useAppQueriesContext } from 'src/contexts/appQueriesContext';
import { OrgsActions } from 'src/features/orgs/orgsSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import type { IAltinnOrgs } from 'src/types/shared';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

enum ServerStateCacheKey {
  GetOrganizations = 'fetchOrganizations',
}

const extractOrgsFromServerResponse = (response: { orgs: IAltinnOrgs }): IAltinnOrgs => response.orgs;

export const useOrgsQuery = (): UseQueryResult<IAltinnOrgs> => {
  const dispatch = useAppDispatch();
  const { fetchOrgs } = useAppQueriesContext();
  return useQuery([ServerStateCacheKey.GetOrganizations], () => fetchOrgs().then(extractOrgsFromServerResponse), {
    onSuccess: (orgs) => {
      // Update the Redux Store ensures that legacy code has access to the data without using the Tanstack Query Cache
      dispatch(OrgsActions.fetchFulfilled({ orgs }));
    },
    onError: (error: HttpClientError) => {
      // Update the Redux Store ensures that legacy code has access to the data without using the Tanstack Query Cache
      OrgsActions.fetchRejected({ error });
    },
  });
};
