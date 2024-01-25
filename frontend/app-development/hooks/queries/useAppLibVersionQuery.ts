import { useQuery } from '@tanstack/react-query';
import { getAppLibVersion } from 'app-shared/api/queries';
import type { AppLibVersion } from 'app-shared/types/AppLibVersion';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Query to get the app-lib version.
 *
 * @param org the organisation of the user
 * @param repo the repo the user is in
 *
 * @returns UseQueryResult with the version
 */
export const useAppLibVersionQuery = (org: string, repo: string) => {
  return useQuery<AppLibVersion>({
    queryKey: [QueryKey.AppLibVersion, org, repo],
    queryFn: () => getAppLibVersion(org, repo),
  });
};
