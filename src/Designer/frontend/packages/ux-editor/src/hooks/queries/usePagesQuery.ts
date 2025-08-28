import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';
import { QueryKey } from 'app-shared/types/QueryKey';

export const usePagesQuery = (
  org: string,
  app: string,
  layoutSetName: string,
): UseQueryResult<PagesModel> => {
  const { getPages } = useServicesContext();

  return useQuery<PagesModel>({
    queryKey: [QueryKey.Pages, org, app, layoutSetName],
    queryFn: () =>
      getPages(org, app, layoutSetName).then((pages) => {
        return pages;
      }),
    enabled: !!layoutSetName,
  });
};
