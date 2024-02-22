import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { AppVersion } from 'app-shared/types/AppVersion';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useAppVersionQuery = (org: string, app: string): UseQueryResult<AppVersion> => {
  const { getAppVersion } = useServicesContext();
  return useQuery<AppVersion>({
    queryKey: [QueryKey.AppVersion, org, app],
    queryFn: () => getAppVersion(org, app),
  });
};
