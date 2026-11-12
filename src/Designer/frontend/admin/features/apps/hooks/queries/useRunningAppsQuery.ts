import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { PublishedApplication } from 'admin/features/apps/types/PublishedApplication';
import { runningAppsPath } from 'admin/features/apps/utils/apiPaths';
import { QueryKey } from 'app-shared/types/QueryKey';
import { getAdminResource } from 'admin/features/apps/utils/getAdminResource';

export const useRunningAppsQuery = (
  org: string,
): UseQueryResult<Record<string, PublishedApplication[]>> => {
  return useQuery<Record<string, PublishedApplication[]>>({
    queryKey: [QueryKey.PublishedApps, org],
    queryFn: async ({ signal }) =>
      await getAdminResource<Record<string, PublishedApplication[]>>(runningAppsPath(org), {
        signal,
      }),
  });
};
