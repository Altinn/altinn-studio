import { useEffect } from 'react';

import { skipToken, useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { ContextNotProvided } from 'src/core/contexts/context';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { useCurrentLayoutSetId } from 'src/features/form/layoutSets/useCurrentLayoutSet';
import type { QueryDefinition } from 'src/core/queries/usePrefetchQuery';
import type { IFormDynamics } from 'src/features/form/dynamics';

// Also used for prefetching @see formPrefetcher.ts
export function useDynamicsQueryDef(layoutSetId?: string): QueryDefinition<{ data: IFormDynamics } | null> {
  const { fetchDynamics } = useAppQueries();
  return {
    queryKey: ['fetchDynamics', layoutSetId],
    queryFn: layoutSetId ? () => fetchDynamics(layoutSetId) : skipToken,
    enabled: !!layoutSetId,
  };
}

function useDynamicsQuery() {
  const layoutSetId = useCurrentLayoutSetId();

  if (!layoutSetId) {
    throw new Error('No layoutSet id found');
  }

  const utils = useQuery({
    ...useDynamicsQueryDef(layoutSetId),
    select: (dynamics) => dynamics?.data || null,
  });

  useEffect(() => {
    utils.error && window.logError('Fetching dynamics failed:\n', utils.error);
  }, [utils.error]);

  return utils;
}

const { Provider, useCtx, useLaxCtx } = delayedContext(() =>
  createQueryContext({
    name: 'Dynamics',
    required: true,
    query: useDynamicsQuery,
  }),
);

export const DynamicsProvider = Provider;
export const useDynamics = () => useCtx();
export const useRuleConnections = () => {
  const dynamics = useLaxCtx();
  return dynamics === ContextNotProvided ? null : (dynamics?.ruleConnection ?? null);
};
