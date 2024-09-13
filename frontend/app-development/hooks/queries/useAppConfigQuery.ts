import type { QueryMeta } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { AppConfig } from 'app-shared/types/AppConfig';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Query to get config for an application
 *
 * @param org the organisation of the user
 * @param app the app the user is in
 * @param meta the query meta data
 *
 * @returns UseQueryResult with a string result
 */
export const useAppConfigQuery = (org: string, app: string, meta?: QueryMeta) => {
  const { getAppConfig } = useServicesContext();

  return useQuery<AppConfig>({
    queryKey: [QueryKey.AppConfig, org, app],
    queryFn: () => getAppConfig(org, app),
    meta,
  });
};
