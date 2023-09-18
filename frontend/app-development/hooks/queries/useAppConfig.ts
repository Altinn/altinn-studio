import { useQuery, UseQueryResult } from '@tanstack/react-query';
import type { AppConfig } from 'app-shared/types/AppConfig';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * Query to get config for an application
 *
 * @param org the organisation of the user
 * @param app the app the user is in
 *
 * @returns UseQueryResult with a string result
 */
export const useAppConfig = (org: string, app: string): UseQueryResult<AppConfig> => {
  const { getAppConfig } = useServicesContext();

  return useQuery<AppConfig>([QueryKey.AppConfig, org, app], () => getAppConfig(org, app));
};
