import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { ContextNotProvided } from 'src/core/contexts/context';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { FormDynamicsActions } from 'src/features/form/dynamics/formDynamicsSlice';
import { useCurrentLayoutSetId } from 'src/features/form/layoutSets/useCurrentLayoutSetId';
import { useAppDispatch } from 'src/hooks/useAppDispatch';

function useDynamicsQuery() {
  const dispatch = useAppDispatch();
  const { fetchDynamics } = useAppQueries();
  const layoutSetId = useCurrentLayoutSetId();

  return useQuery({
    queryKey: ['fetchDynamics', layoutSetId],
    queryFn: async () => (await fetchDynamics(layoutSetId))?.data || null,
    onSuccess: (dynamics) => {
      if (dynamics) {
        dispatch(FormDynamicsActions.fetchFulfilled(dynamics));
      }
    },
    onError: (error: AxiosError) => {
      window.logError('Fetching dynamics failed:\n', error);
    },
  });
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
  return dynamics === ContextNotProvided ? null : dynamics?.ruleConnection ?? null;
};
