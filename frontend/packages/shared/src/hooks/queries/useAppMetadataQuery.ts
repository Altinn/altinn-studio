import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { RepositoryType } from 'app-shared/types/global';
import { QueryKey } from 'app-shared/types/QueryKey';
import { getRepositoryType } from 'app-shared/utils/repository';
import type { AxiosError } from 'axios';

/**
 * Query to get the metadata of an app.
 *
 * @param org the organisation of the user
 * @param app the app the user is in
 *
 * @returns UseQueryResult with an object of Policy
 */
export const useAppMetadataQuery = (
  org: string,
  app: string,
): UseQueryResult<ApplicationMetadata, AxiosError> => {
  const { getAppMetadata } = useServicesContext();
  const repoType = getRepositoryType(org, app);

  return useQuery<ApplicationMetadata, AxiosError>({
    queryKey: [QueryKey.AppMetadata, org, app],
    queryFn: () => getAppMetadata(org, app),
    enabled: repoType !== RepositoryType.DataModels,
  });
};
