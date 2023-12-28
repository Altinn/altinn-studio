import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { preProcessItem } from 'src/features/expressions/validation';
import { cleanLayout } from 'src/features/form/layout/cleanLayout';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { useLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { useCurrentLayoutSetId } from 'src/features/form/layoutSets/useCurrentLayoutSetId';
import { useHasInstance } from 'src/features/instance/InstanceContext';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useNavigationParams } from 'src/hooks/useNavigatePage';
import type { ExprObjConfig, ExprVal } from 'src/features/expressions/types';
import type { ILayoutFileExternal } from 'src/layout/common.generated';
import type { ILayoutCollection, ILayouts } from 'src/layout/layout';
import type { IHiddenLayoutsExternal } from 'src/types';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

export interface LayoutContextValue {
  layouts: ILayouts;
  hiddenLayoutsExpressions: IHiddenLayoutsExternal;
}

function useLayoutQuery() {
  const { fetchLayouts } = useAppQueries();
  const hasInstance = useHasInstance();
  const process = useLaxProcessData();
  const currentLayoutSetId = useLayoutSetId();
  const dispatch = useAppDispatch();

  const query = useQuery({
    // Waiting to fetch layouts until we have an instance, if we're supposed to have one
    // We don't want to fetch form layouts for a process step which we are currently not on
    enabled: hasInstance ? !!process : true,
    queryKey: ['formLayouts', currentLayoutSetId],
    queryFn: async () => processLayouts(await fetchLayouts(currentLayoutSetId!)),
    onError: (error: HttpClientError) => {
      window.logError('Fetching form layout failed:\n', error);
    },
  });

  useEffect(() => {
    if (!query.data) {
      return;
    }

    dispatch(
      FormLayoutActions.fetchFulfilled({
        layouts: query.data.layouts,
        hiddenLayoutsExpressions: query.data.hiddenLayoutsExpressions,
        layoutSetId: currentLayoutSetId || null,
      }),
    );
  }, [query.data, currentLayoutSetId, dispatch]);

  return query;
}
const { Provider, useCtx } = delayedContext(() =>
  createQueryContext({
    name: 'LayoutsContext',
    required: true,
    query: useLayoutQuery,
  }),
);

export function useLayoutSetId() {
  const layoutSets = useLayoutSets();
  const currentProcessLayoutSetId = useCurrentLayoutSetId();
  const { taskId } = useNavigationParams();

  const layoutSetId = taskId != null ? layoutSets?.sets.find((set) => set.tasks?.includes(taskId))?.id : undefined;

  return layoutSetId ?? currentProcessLayoutSetId;
}
export const LayoutsProvider = Provider;
export const useLayouts = () => useCtx().layouts;

export const useHiddenLayoutsExpressions = () => useCtx().hiddenLayoutsExpressions;

function isSingleLayout(layouts: ILayoutCollection | ILayoutFileExternal): layouts is ILayoutFileExternal {
  return 'data' in layouts && 'layout' in layouts.data && Array.isArray(layouts.data.layout);
}

function processLayouts(input: ILayoutCollection | ILayoutFileExternal): LayoutContextValue {
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

  return {
    layouts,
    hiddenLayoutsExpressions,
  };
}
