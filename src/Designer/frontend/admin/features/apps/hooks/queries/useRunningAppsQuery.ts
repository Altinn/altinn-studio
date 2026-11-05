import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { PublishedApplication } from 'admin/features/apps/types/PublishedApplication';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export const useRunningAppsQuery = (
  org: string,
): UseQueryResult<Record<string, PublishedApplication[]>> => {
  const { getRunningApps } = useServicesContext();
  return useQuery<Record<string, PublishedApplication[]>>({
    queryKey: [QueryKey.PublishedApps, org],
    queryFn: async ({ signal }) => getRunningApps(org, signal),
  });
};
