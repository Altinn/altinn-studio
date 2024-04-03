import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { AppRelease } from 'app-shared/types/AppRelease';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useAppReleasesQuery = (owner, app): UseQueryResult<AppRelease[]> => {
  const { getAppReleases } = useServicesContext();
  return useQuery<AppRelease[]>({
    queryKey: [QueryKey.AppReleases, owner, app],
    queryFn: () =>
      getAppReleases(owner, app).then((appReleasesResponse) => appReleasesResponse.results),
  });
};
