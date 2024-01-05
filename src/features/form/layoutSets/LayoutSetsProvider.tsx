import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import type { ILayoutSets } from 'src/layout/common.generated';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

const useLayoutSetsQuery = () => {
  const dispatch = useAppDispatch();
  const { fetchLayoutSets } = useAppQueries();
  return useQuery({
    queryKey: ['fetchLayoutSets'],
    queryFn: fetchLayoutSets,
    onSuccess: (layoutSets) => {
      dispatch(FormLayoutActions.fetchSetsFulfilled({ layoutSets }));
    },
    onError: (error: HttpClientError) => {
      window.logError('Fetching layout sets failed:\n', error);
    },
  });
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
