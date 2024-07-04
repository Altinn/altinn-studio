import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useAppMetadataModelIdsQuery = (
  org: string,
  app: string,
  onlyUnReferenced: boolean = true,
): UseQueryResult<string[]> => {
  const { getAppMetadataModelIds } = useServicesContext();
  return useQuery<string[]>({
    queryKey: [QueryKey.AppMetadataModelIds, org, app, onlyUnReferenced],
    queryFn: () => getAppMetadataModelIds(org, app, onlyUnReferenced),
  });
};
