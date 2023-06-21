import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { AppRelease } from 'app-shared/types/AppRelease';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useAppReleasesQuery = (owner, app): UseQueryResult<AppRelease[]> => {
  const { getAppReleases } = useServicesContext();
  return useQuery<AppRelease[]>(
    [QueryKey.AppReleases, owner, app],
    () => getAppReleases(owner, app).then((res) => res.results),
  );
};
