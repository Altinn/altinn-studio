import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { ContextNotProvided } from 'src/core/contexts/context';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import type { ILayoutSets } from 'src/layout/common.generated';

// Also used for prefetching @see appPrefetcher.ts
export function useLayoutSetsQueryDef() {
  const { fetchLayoutSets } = useAppQueries();
  return {
    queryKey: ['fetchLayoutSets'],
    queryFn: fetchLayoutSets,
  };
}

export const useLayoutSetsQuery = () => {
  const utils = useQuery(useLayoutSetsQueryDef());

  useEffect(() => {
    utils.error && window.logError('Fetching layout sets failed:\n', utils.error);
  }, [utils.error]);

  return utils;
};

const { Provider, useCtx, useLaxCtx } = delayedContext(() =>
  createQueryContext<ILayoutSets, true>({
    name: 'LayoutSets',
    required: true,
    query: useLayoutSetsQuery,
    process: (layoutSets) => {
      if (layoutSets?.uiSettings?.taskNavigation) {
        return {
          ...layoutSets,
          uiSettings: {
            ...layoutSets.uiSettings,
            taskNavigation: layoutSets.uiSettings.taskNavigation.map((g) => ({ ...g, id: uuidv4() })),
          },
        };
      }
      return layoutSets;
    },
  }),
);

export const LayoutSetsProvider = Provider;
export const useLayoutSets = () => useCtx().sets;
export const useLaxLayoutSets = () => {
  const layoutSets = useLaxCtx();
  return layoutSets !== ContextNotProvided ? layoutSets.sets : ContextNotProvided;
};

/**
 * **Warning**: You probably want to use `usePageSettings` instead.
 * This returns uiSettings from layout-sets.json,
 * these settings can be overridden by settings in Settings.json
 */
export const useLaxGlobalUISettings = () => {
  const layoutSets = useLaxCtx();
  return layoutSets !== ContextNotProvided ? layoutSets.uiSettings : ContextNotProvided;
};
