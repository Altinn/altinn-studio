import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useGetAllImagesQuery = (org: string, app: string): UseQueryResult<string[]> => {
  const { getAllImages } = useServicesContext();
  return useQuery<string[]>({
    queryKey: [QueryKey.ImageFileNames, org, app],
    queryFn: () => getAllImages(org, app),
  });
};
