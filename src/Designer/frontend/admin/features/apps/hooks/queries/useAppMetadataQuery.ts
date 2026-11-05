import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { RunningApplicationMetadata } from 'admin/features/apps/types/RunningApplicationMetadata';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export const useAppMetadataQuery = (
  org: string,
  env: string,
  app: string,
): UseQueryResult<RunningApplicationMetadata> => {
  const { getRunningAppMetadata } = useServicesContext();
  return useQuery<RunningApplicationMetadata>({
    queryKey: [QueryKey.AppMetadata, org, env, app],
    queryFn: async ({ signal }) => getRunningAppMetadata(org, env, app, signal),
  });
};
