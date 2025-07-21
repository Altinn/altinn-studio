import { queryOptions, useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { useIsAllowAnonymous } from 'src/features/stateless/getAllowAnonymous';
import { fetchUserProfile } from 'src/queries/queries';
import { isAxiosError } from 'src/utils/isAxiosError';
import type { IProfile } from 'src/types/shared';

function profileQueryOptions(enabled: boolean) {
  return queryOptions<IProfile | null>({
    queryKey: ['fetchUserProfile', enabled],
    queryFn: fetchUserProfile,
    enabled,
    placeholderData: null,
  });
}

const canHandleProfileQueryError = (error: UseQueryResult<IProfile | undefined>['error']) =>
  // The backend will return 400 if the logged in user/client is not a user.
  // Altinn users have profiles, but organisations, service owners and system users do not, so this is expected
  isAxiosError(error) && error.response?.status === 400;

export const useProfileQuery = () => {
  const enabled = useShouldFetchProfile();
  const query = useQuery(profileQueryOptions(enabled));

  const shouldReturnNull = !enabled || (query.isError && canHandleProfileQueryError(query.error));

  return {
    ...query,
    data: shouldReturnNull ? null : query.data,
    enabled,
  };
};

const { Provider, useCtx } = delayedContext(() =>
  createQueryContext<IProfile | null, false>({
    name: 'Profile',
    required: false,
    default: null,
    shouldDisplayError: (error) => !canHandleProfileQueryError(error),
    query: useProfileQuery,
  }),
);

export const ProfileProvider = Provider;
export const useProfile = () => useCtx();
export const useShouldFetchProfile = () => useIsAllowAnonymous(false);
