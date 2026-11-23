import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { LayoutComponent, PageLayouts } from '../types';

export const usePageLayoutsQuery = (
  org: string,
  app: string,
  layoutSetName: string,
): UseQueryResult<PageLayouts> => {
  const { getFormLayouts } = useServicesContext();
  return useQuery<PageLayouts>({
    queryKey: [QueryKey.AppBuilderFormLayouts, org, app, layoutSetName],
    queryFn: () => getFormLayouts<LayoutComponent>(org, app, layoutSetName),
    enabled: Boolean(layoutSetName),
  });
};
