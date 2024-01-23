import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { AppVersionResponse } from 'app-shared/types/api/AppVersionReponse';

export const useAppVersionQuery = (
  org: string,
  app: string,
): UseQueryResult<AppVersionResponse> => {
  const { getAppVersion } = useServicesContext();
  return useQuery<AppVersionResponse>({
    queryKey: [QueryKey.FrontEndSettings, org, app],
    queryFn: () => {
      return { backend: '8.0.0', frontend: '4.0.0' };
    }, // TODO: remove and use api endpoint
    // queryFn: () => getAppVersion(org, app),
  });
};
