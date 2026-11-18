import { useQueries } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { LayoutComponent, PageLayouts } from '../types';
import type { AllLayouts } from '../utils/deletionUtils';

export type AllLayoutsQueryResult = {
  allLayouts?: AllLayouts;
  isPending: boolean;
};

/** Loads the pages of every layout set, with the same cache as the canvas uses for one of them. */
export const useAllLayoutsQuery = (
  org: string,
  app: string,
  layoutSetNames: string[],
): AllLayoutsQueryResult => {
  const { getFormLayouts } = useServicesContext();
  const results = useQueries({
    queries: layoutSetNames.map((layoutSetName) => ({
      queryKey: [QueryKey.AppBuilderFormLayouts, org, app, layoutSetName],
      queryFn: (): Promise<PageLayouts> => getFormLayouts<LayoutComponent>(org, app, layoutSetName),
    })),
  });

  if (results.some(({ isPending }) => isPending)) return { isPending: true };
  const allLayouts = Object.fromEntries(
    layoutSetNames.map((layoutSetName, index) => [layoutSetName, results[index].data ?? {}]),
  );
  return { allLayouts, isPending: false };
};
