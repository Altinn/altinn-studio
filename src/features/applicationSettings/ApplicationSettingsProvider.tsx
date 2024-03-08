import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { isAxiosError } from 'src/utils/isAxiosError';

const useApplicationSettingsQuery = () => {
  const { fetchApplicationSettings } = useAppQueries();
  const utils = useQuery({
    queryKey: ['fetchApplicationSettings'],
    queryFn: fetchApplicationSettings,
  });

  useEffect(() => {
    utils.error && window.logError('Fetching application settings failed:\n', utils.error);
  }, [utils.error]);

  return utils;
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
