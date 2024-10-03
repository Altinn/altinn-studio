import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { layoutSetIsDefault, layoutSetIsSubform } from 'src/features/form/layoutSets/TypeGuards';
import { InvalidSubformLayoutException } from 'src/features/formData/InvalidSubformLayoutException';
import type { ILayoutSet, ILayoutSets } from 'src/layout/common.generated';

// Also used for prefetching @see appPrefetcher.ts
export function useLayoutSetsQueryDef() {
  const { fetchLayoutSets } = useAppQueries();
  return {
    queryKey: ['fetchLayoutSets'],
    queryFn: fetchLayoutSets,
  };
}

const useLayoutSetsQuery = () => {
  const utils = useQuery(useLayoutSetsQueryDef());

  useEffect(() => {
    utils.error && window.logError('Fetching layout sets failed:\n', utils.error);
  }, [utils.error]);

  useEffect(() => {
    utils.data?.sets.forEach((set) => validateLayout(set));
  }, [utils]);

  return utils;
};

const { Provider, useCtx, useLaxCtx } = delayedContext(() =>
  createQueryContext<Omit<ILayoutSets, 'uiSettings'>, true>({
    name: 'LayoutSets',
    required: true,
    query: useLayoutSetsQuery,
  }),
);

function validateLayout(set: ILayoutSet): void {
  if (layoutSetIsSubform(set) && layoutSetIsDefault(set)) {
    window.logError(`The layout set with id '${set.id}' cannot have both type "subform" and a task association.`);
    throw new InvalidSubformLayoutException(set.id);
  }
}

export const LayoutSetsProvider = Provider;
export const useLayoutSets = () => useCtx();
export const useLaxLayoutSets = () => useLaxCtx();
