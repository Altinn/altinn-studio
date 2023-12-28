import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { ApplicationSettingsActions } from 'src/features/applicationSettings/applicationSettingsSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { isAxiosError } from 'src/utils/isAxiosError';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

const useApplicationSettingsQuery = () => {
  const dispatch = useAppDispatch();
  const { fetchApplicationSettings } = useAppQueries();
  return useQuery({
    queryKey: ['fetchApplicationSettings'],
    queryFn: fetchApplicationSettings,
    onSuccess: (settings) => {
      dispatch(ApplicationSettingsActions.fetchApplicationSettingsFulfilled({ settings }));
    },
    onError: (error: HttpClientError) => {
      if (error.status === 404) {
        window.logWarn('Application settings not found:\n', error);
      } else {
        window.logError('Fetching application settings failed:\n', error);
      }
    },
  });
};

const { Provider, useCtx, useLaxCtx } = delayedContext(() =>
  createQueryContext({
    name: 'ApplicationSettings',
    required: true,
    query: useApplicationSettingsQuery,
    shouldDisplayError: (err) => !(isAxiosError(err) && err.response?.status === 404),
  }),
);

export const ApplicationSettingsProvider = Provider;
export const useApplicationSettings = () => useCtx();
export const useLaxApplicationSettings = () => useLaxCtx();
