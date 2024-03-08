import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import type { ILayoutSets } from 'src/layout/common.generated';

const useLayoutSetsQuery = () => {
  const { fetchLayoutSets } = useAppQueries();
  const utils = useQuery({
    queryKey: ['fetchLayoutSets'],
    queryFn: fetchLayoutSets,
  });

  useEffect(() => {
    utils.error && window.logError('Fetching layout sets failed:\n', utils.error);
  }, [utils.error]);

  return utils;
};

const { Provider, useCtx, useLaxCtx } = delayedContext(() =>
  createQueryContext<Omit<ILayoutSets, 'uiSettings'>, true>({
    name: 'LayoutSets',
    required: true,
    query: useLayoutSetsQuery,
  }),
);

export const LayoutSetsProvider = Provider;
export const useLayoutSets = () => useCtx();
export const useLaxLayoutSets = () => useLaxCtx();
