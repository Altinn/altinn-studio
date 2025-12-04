import { useMemo } from 'react';

import { v4 as uuidv4 } from 'uuid';

import { ContextNotProvided } from 'src/core/contexts/context';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import type { ILayoutSets } from 'src/layout/common.generated';

// Also used for prefetching @see appPrefetcher.ts
export function useLayoutSetsQueryDef() {
  return {
    queryKey: ['fetchLayoutSets'],
    queryFn: async () => window.AltinnAppData?.layoutSets,
  };
}

export const useLayoutSetsQuery = () => {
  const layoutSets = useMemo(() => {
    const data = window.AltinnAppData?.layoutSets;

    if (data?.uiSettings?.taskNavigation) {
      return {
        ...data,
        uiSettings: {
          ...data.uiSettings,
          taskNavigation: data.uiSettings.taskNavigation.map((g) => ({ ...g, id: uuidv4() })),
        },
      };
    }
    return data;
  }, []);

  return {
    data: layoutSets,
    isLoading: false,
    error: null,
  };
};

const { Provider, useCtx, useLaxCtx } = delayedContext(() =>
  createQueryContext<ILayoutSets, true>({
    name: 'LayoutSets',
    required: true,
    query: useLayoutSetsQuery,
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
