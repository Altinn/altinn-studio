import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchUserProfile } from 'src/http-client/queries';
import type { IProfile } from 'src/types/shared';

export const PROFILE_QUERY_KEY = 'USER_PROFILE';

function profileQueryOptions(enabled: boolean) {
  return queryOptions<IProfile | null>({
    queryKey: [PROFILE_QUERY_KEY],
    queryFn: fetchUserProfile,
    enabled,
    placeholderData: null,
  });
}

export const useProfileQuery = () => {
  const query = useQuery(profileQueryOptions(false));
  return {
    ...query,
  };
};

export const useRefetchProfile = () => {
  const queryClient = useQueryClient();

  return () =>
    queryClient.invalidateQueries({
      queryKey: [PROFILE_QUERY_KEY],
    });
};
