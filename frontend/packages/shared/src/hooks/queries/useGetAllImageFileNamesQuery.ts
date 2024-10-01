import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useGetAllImageFileNamesQuery = (
  org: string,
  app: string,
): UseQueryResult<string[]> => {
  const { getImageFileNames } = useServicesContext();
  return useQuery<string[]>({
    queryKey: [QueryKey.ImageFileNames, org, app],
    queryFn: () => getImageFileNames(org, app),
  });
};
