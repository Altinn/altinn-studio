import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { SimpleInstanceDetails } from 'admin/features/apps/types/SimpleInstanceDetails';
import { INSTANCE_DETAILS_REFETCH_INTERVAL_MS } from 'admin/features/apps/utils/workflowRefetch';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export const useAppInstanceDetailsQuery = (
  org: string,
  env: string,
  app: string,
  id: string,
): UseQueryResult<SimpleInstanceDetails> => {
  const { getAppInstanceDetails } = useServicesContext();
  return useQuery<SimpleInstanceDetails>({
    queryKey: [QueryKey.AppInstanceDetails, org, env, app, id],
    queryFn: async ({ signal }) => getAppInstanceDetails(org, env, app, id, signal),
    // The process task and status move while the operator watches, driven from the app or by a
    // workflow the engine just finished; the page reads them again on the same cadence as the
    // workflows, and when the operator comes back to the tab.
    refetchInterval: INSTANCE_DETAILS_REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
    staleTime: INSTANCE_DETAILS_REFETCH_INTERVAL_MS,
  });
};
