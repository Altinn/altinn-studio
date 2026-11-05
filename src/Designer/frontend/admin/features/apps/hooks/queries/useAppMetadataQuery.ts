import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { get } from 'app-shared/utils/networking';
import { appMetadataPath } from 'admin/features/apps/utils/apiPaths';
import type { RunningApplicationMetadata } from 'admin/features/apps/types/RunningApplicationMetadata';

export const useAppMetadataQuery = (
  org: string,
  env: string,
  app: string,
): UseQueryResult<RunningApplicationMetadata> => {
  return useQuery<RunningApplicationMetadata>({
    queryKey: [QueryKey.AppMetadata, org, env, app],
    queryFn: async ({ signal }) =>
      await get<RunningApplicationMetadata>(appMetadataPath(org, env, app), {
        signal,
      }),
  });
};
