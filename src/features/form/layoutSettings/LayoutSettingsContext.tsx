import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { useCurrentLayoutSetId } from 'src/features/form/layout/useCurrentLayoutSetId';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

function useLayoutSettingsQuery() {
  const { fetchLayoutSettings } = useAppQueries();
  const layoutSetId = useCurrentLayoutSetId();
  const dispatch = useAppDispatch();

  return useQuery({
    queryKey: ['layoutSettings', layoutSetId],
    queryFn: () => fetchLayoutSettings(layoutSetId),
    onSuccess: (settings) => {
      dispatch(FormLayoutActions.fetchSettingsFulfilled({ settings }));
    },
    onError: (error: HttpClientError) => {
      window.logError('Fetching layout settings failed:\n', error);
    },
  });
}

const { Provider, useCtx } = delayedContext(() =>
  createQueryContext({
    name: 'LayoutSettings',
    required: true,
    query: useLayoutSettingsQuery,
  }),
);

export const LayoutSettingsProvider = Provider;
export const useLayoutSettings = () => useCtx();
