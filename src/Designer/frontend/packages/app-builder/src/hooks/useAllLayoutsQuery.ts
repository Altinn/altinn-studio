import { useQueries } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { LayoutComponent, PageLayouts } from '../types';
import type { AllLayouts } from '../utils/deletionUtils';

export type AllLayoutsQueryResult = {
  allLayouts?: AllLayouts;
  isPending: boolean;
  /**
   * True when the pages of a layout set could not be loaded. Then it is unknown what uses a text or a
   * field, so nothing should be removed.
   */
  isError: boolean;
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

  if (results.some(({ isError }) => isError)) return { isPending: false, isError: true };
  if (results.some(({ isPending }) => isPending)) return { isPending: true, isError: false };
  const allLayouts = Object.fromEntries(
    layoutSetNames.map((layoutSetName, index) => [layoutSetName, results[index].data]),
  );
  return { allLayouts, isPending: false, isError: false };
};
