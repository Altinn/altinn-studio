import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { preProcessItem } from 'src/features/expressions/validation';
import { cleanLayout } from 'src/features/form/layout/cleanLayout';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { useCurrentLayoutSetId } from 'src/features/form/layout/useCurrentLayoutSetId';
import { useHasInstance, useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import type { ExprObjConfig, ExprVal } from 'src/features/expressions/types';
import type { ILayoutFileExternal } from 'src/layout/common.generated';
import type { ILayoutCollection, ILayouts } from 'src/layout/layout';
import type { IHiddenLayoutsExternal } from 'src/types';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

function useLayoutQuery() {
  const { fetchLayouts } = useAppQueries();
  const hasInstance = useHasInstance();
  const process = useLaxProcessData();
  const layoutSetId = useCurrentLayoutSetId();
  const dispatch = useAppDispatch();
  const instance = useLaxInstanceData();
  const applicationMetadata = useApplicationMetadata();

  return useQuery({
    // Waiting to fetch layouts until we have an instance, if we're supposed to have one
    enabled: hasInstance ? !!process : true,

    queryKey: ['formLayouts', layoutSetId],
    queryFn: async () => {
      const currentViewCacheKey = instance?.id || applicationMetadata.id;
      return processLayouts({ input: await fetchLayouts(layoutSetId), dispatch, currentViewCacheKey, layoutSetId });
    },
    onError: (error: HttpClientError) => {
      window.logError('Fetching form layout failed:\n', error);
    },
  });
}

const { Provider, useCtx } = delayedContext(() =>
  createQueryContext({
    name: 'LayoutsContext',
    required: true,
    query: useLayoutQuery,
  }),
);

export const LayoutsProvider = Provider;
export const useLayouts = () => useCtx().layouts;
export const useHiddenLayoutsExpressions = () => useCtx().hiddenLayoutsExpressions;

function isSingleLayout(layouts: ILayoutCollection | ILayoutFileExternal): layouts is ILayoutFileExternal {
  return 'data' in layouts && 'layout' in layouts.data && Array.isArray(layouts.data.layout);
}

interface LegacyProcessProps {
  input: ILayoutCollection | ILayoutFileExternal;
  dispatch: ReturnType<typeof useAppDispatch>;
  currentViewCacheKey: string;
  layoutSetId?: string;
}

function processLayouts({ input, dispatch, currentViewCacheKey, layoutSetId }: LegacyProcessProps) {
  const layouts: ILayouts = {};
  const hiddenLayoutsExpressions: IHiddenLayoutsExternal = {};
  if (isSingleLayout(input)) {
    layouts['FormLayout'] = cleanLayout(input.data.layout);
    hiddenLayoutsExpressions['FormLayout'] = input.data.hidden;
  } else {
    for (const key of Object.keys(input)) {
      const file = input[key];
      layouts[key] = cleanLayout(file.data.layout);
      hiddenLayoutsExpressions[key] = file.data.hidden;
    }
  }

  const orderedLayoutKeys = Object.keys(layouts).sort();

  // use instance id (or application id for stateless) as cache key for current page
  dispatch(FormLayoutActions.setCurrentViewCacheKey({ key: currentViewCacheKey }));

  const lastVisitedPage = localStorage.getItem(currentViewCacheKey);
  const firstLayoutKey =
    lastVisitedPage && orderedLayoutKeys.includes(lastVisitedPage) ? lastVisitedPage : orderedLayoutKeys[0];

  const config: ExprObjConfig<{ hidden: ExprVal.Boolean; whatever: string }> = {
    hidden: {
      returnType: 'test',
      defaultValue: false,
      resolvePerRow: false,
    },
  };

  for (const key of Object.keys(hiddenLayoutsExpressions)) {
    hiddenLayoutsExpressions[key] = preProcessItem(hiddenLayoutsExpressions[key], config, ['hidden'], key);
  }

  dispatch(
    FormLayoutActions.fetchFulfilled({
      layouts,
      hiddenLayoutsExpressions,
      layoutSetId: layoutSetId || null,
    }),
  );
  dispatch(FormLayoutActions.initRepeatingGroups({}));
  dispatch(
    FormLayoutActions.updateCurrentView({
      newView: firstLayoutKey,
      skipPageCaching: true,
    }),
  );

  return {
    layouts,
    hiddenLayoutsExpressions,
  };
}
