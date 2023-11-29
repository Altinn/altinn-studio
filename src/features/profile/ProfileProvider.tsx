import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { useSetCurrentLanguage } from 'src/features/language/LanguageProvider';
import { ProfileActions } from 'src/features/profile/profileSlice';
import { useAllowAnonymousIs } from 'src/features/stateless/getAllowAnonymous';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import type { IProfile } from 'src/types/shared';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

const useProfileQuery = () => {
  const dispatch = useAppDispatch();
  const enabled = useShouldFetchProfile();
  const { updateProfile } = useSetCurrentLanguage();

  const { fetchUserProfile } = useAppQueries();
  const utils = useQuery({
    enabled,
    queryKey: ['fetchUserProfile'],
    queryFn: () => fetchUserProfile(),
    onSuccess: (profile) => {
      dispatch(ProfileActions.fetchFulfilled({ profile }));
    },
    onError: (error: HttpClientError) => {
      window.logError('Fetching user profile failed:\n', error);
    },
  });

  useEffect(() => {
    if (utils.data) {
      updateProfile(utils.data);
    }
  }, [updateProfile, utils.data]);

  return {
    ...utils,
    enabled,
  };
};

const { Provider, useCtx } = delayedContext(() =>
  createQueryContext<IProfile | undefined, false>({
    name: 'Profile',
    required: false,
    default: undefined,
    query: useProfileQuery,
  }),
);

export const ProfileProvider = Provider;
export const useProfile = () => useCtx();
export const useShouldFetchProfile = () => useAllowAnonymousIs(false);
