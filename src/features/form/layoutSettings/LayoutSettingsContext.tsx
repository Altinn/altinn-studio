import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { useLayoutSetId } from 'src/features/form/layout/LayoutsContext';
import { useLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

function useLayoutSettingsQuery() {
  const { fetchLayoutSettings } = useAppQueries();
  const layoutSetId = useLayoutSetId();
  const dispatch = useAppDispatch();
  const globalPagesSettings = useLayoutSets().uiSettings;

  const queryId = layoutSetId;

  const utils = useQuery({
    queryKey: ['layoutSettings', queryId],
    queryFn: () => fetchLayoutSettings(queryId),
    onSuccess: (settings) => {
      dispatch(FormLayoutActions.fetchSettingsFulfilled({ settings }));
    },
    onError: (error: HttpClientError) => {
      window.logError('Fetching layout settings failed:\n', error);
    },
  });

  if (utils.data) {
    // Merge the global pages settings with the layout-set specific settings, so that we have a single source
    // of truth for the pages settings
    return {
      ...utils,
      data: {
        ...utils.data,
        pages: {
          ...globalPagesSettings,
          ...utils.data.pages,
        },
      },
    };
  }

  return utils;
}

const { Provider, useCtx, useLaxCtx } = delayedContext(() =>
  createQueryContext({
    name: 'LayoutSettings',
    required: true,
    query: useLayoutSettingsQuery,
  }),
);

export const LayoutSettingsProvider = Provider;
export const useLayoutSettings = () => useCtx();
export const useLaxLayoutSettings = () => useLaxCtx();
