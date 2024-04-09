import type { QueryMeta, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { AppRelease } from 'app-shared/types/AppRelease';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useAppReleasesQuery = (
  owner: string,
  app: string,
  meta?: QueryMeta,
): UseQueryResult<AppRelease[]> => {
  const { getAppReleases } = useServicesContext();
  return useQuery<AppRelease[]>({
    queryKey: [QueryKey.AppReleases, owner, app],
    queryFn: () =>
      getAppReleases(owner, app).then((appReleasesResponse) => appReleasesResponse.results),
    meta,
  });
};
