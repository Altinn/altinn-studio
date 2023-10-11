import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { useAppQueries } from 'src/contexts/appQueriesContext';
import { FormDynamicsActions } from 'src/features/dynamics/formDynamicsSlice';
import { useCurrentLayoutSetId } from 'src/features/layout/useLayouts';
import { QueueActions } from 'src/features/queue/queueSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import type { IFormDynamics } from 'src/features/dynamics';

export const useDynamicsQuery = (enabled: boolean): UseQueryResult<{ data: IFormDynamics } | null> => {
  const dispatch = useAppDispatch();
  const { fetchDynamics } = useAppQueries();
  const layoutSetId = useCurrentLayoutSetId();

  return useQuery(['fetchDynamics', layoutSetId], () => fetchDynamics(layoutSetId), {
    enabled,
    onSuccess: (dynamics) => {
      if (dynamics) {
        dispatch(FormDynamicsActions.fetchFulfilled(dynamics.data));
      } else {
        dispatch(FormDynamicsActions.fetchRejected({ error: null }));
      }
    },
    onError: (error: AxiosError) => {
      dispatch(QueueActions.dataTaskQueueError({ error }));
      dispatch(FormDynamicsActions.fetchRejected({ error }));
      window.logError('Fetching dynamics failed:\n', error);
    },
  });
};
