import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { PublishedApplicationDetails } from 'admin/features/apps/types/PublishedApplicationDetails';
import { appDetailsPath } from 'admin/features/apps/utils/apiPaths';
import { QueryKey } from 'app-shared/types/QueryKey';
import { getResource } from 'admin/features/apps/utils/getResource';

export const useAppDetailsQuery = (
  org: string,
  env: string,
  app: string,
): UseQueryResult<PublishedApplicationDetails> => {
  return useQuery<PublishedApplicationDetails>({
    queryKey: [QueryKey.PublishedAppDetails, org, env, app],
    queryFn: async ({ signal }) =>
      await getResource<PublishedApplicationDetails>(appDetailsPath(org, env, app), { signal }),
  });
};
