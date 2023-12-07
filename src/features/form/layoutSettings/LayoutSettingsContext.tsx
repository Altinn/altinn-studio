import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { useLayoutSetId } from 'src/features/form/layout/LayoutsContext';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

function useLayoutSettingsQuery() {
  const { fetchLayoutSettings } = useAppQueries();
  const layoutSetId = useLayoutSetId();
  const dispatch = useAppDispatch();

  const queryId = layoutSetId;

  return useQuery({
    queryKey: ['layoutSettings', queryId],
    queryFn: () => fetchLayoutSettings(queryId),
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
