import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { AppVersion } from 'app-shared/types/AppVersion';
import { QueryKey } from 'app-shared/types/QueryKey';
import { toast } from 'react-toastify';

export const useAppVersionQuery = (org: string, app: string): UseQueryResult<AppVersion> => {
  const { getAppVersion } = useServicesContext();
  return useQuery<AppVersion>({
    queryKey: [QueryKey.AppVersion, org, app],
    queryFn: () =>
      getAppVersion(org, app).catch((error) => {
        toast.error('getAppVersion --- ', error);

        return error;
      }),
  });
};
