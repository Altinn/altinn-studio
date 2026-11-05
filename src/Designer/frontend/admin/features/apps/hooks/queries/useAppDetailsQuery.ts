import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { PublishedApplicationDetails } from 'admin/features/apps/types/PublishedApplicationDetails';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export const useAppDetailsQuery = (
  org: string,
  env: string,
  app: string,
): UseQueryResult<PublishedApplicationDetails> => {
  const { getPublishedAppDetails } = useServicesContext();
  return useQuery<PublishedApplicationDetails>({
    queryKey: [QueryKey.PublishedAppDetails, org, env, app],
    queryFn: async ({ signal }) => getPublishedAppDetails(org, env, app, signal),
  });
};
