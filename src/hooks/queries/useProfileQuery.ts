import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { useAppQueries } from 'src/contexts/appQueriesContext';
import { ProfileActions } from 'src/features/profile/profileSlice';
import { QueueActions } from 'src/features/queue/queueSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import type { IProfile } from 'src/types/shared';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

export const useProfileQuery = (enabled: boolean): UseQueryResult<IProfile> => {
  const dispatch = useAppDispatch();

  const { fetchUserProfile } = useAppQueries();
  return useQuery(['fetchUserProfile'], fetchUserProfile, {
    enabled,
    onSuccess: (profile) => {
      dispatch(ProfileActions.fetchFulfilled({ profile }));
    },
    onError: (error: HttpClientError) => {
      dispatch(ProfileActions.fetchRejected({ error }));
      dispatch(QueueActions.userTaskQueueError({ error }));
      window.logError('Fetching user profile failed:\n', error);
    },
  });
};
