import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { FormDynamicsActions } from 'src/features/form/dynamics/formDynamicsSlice';
import { useCurrentLayoutSetId } from 'src/features/form/layout/useCurrentLayoutSetId';
import { useAppDispatch } from 'src/hooks/useAppDispatch';

function useDynamicsQuery() {
  const dispatch = useAppDispatch();
  const { fetchDynamics } = useAppQueries();
  const layoutSetId = useCurrentLayoutSetId();

  return useQuery({
    queryKey: ['fetchDynamics', layoutSetId],
    queryFn: () => fetchDynamics(layoutSetId),
    onSuccess: (dynamics) => {
      if (dynamics) {
        dispatch(FormDynamicsActions.fetchFulfilled(dynamics.data));
      }
    },
    onError: (error: AxiosError) => {
      window.logError('Fetching dynamics failed:\n', error);
    },
  });
}

const { Provider } = delayedContext(() =>
  createQueryContext({
    name: 'Dynamics',
    required: true,
    query: useDynamicsQuery,
  }),
);

export const DynamicsProvider = Provider;
