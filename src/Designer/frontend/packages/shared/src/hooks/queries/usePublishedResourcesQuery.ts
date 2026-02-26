import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from '../../types/QueryKey';
import { useServicesContext } from '../../contexts/ServicesContext';

export const usePublishedResourcesQuery = (
  orgName: string,
  path?: string,
): UseQueryResult<string[]> => {
  const { getPublishedResources } = useServicesContext();
  return useQuery<string[]>({
    queryKey: [QueryKey.PublishedResources, orgName, path ?? null],
    queryFn: (): Promise<string[]> => getPublishedResources(orgName, path),
  });
};
