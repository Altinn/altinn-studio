import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useLayoutSetsQuery =
  (org: string, app: string): UseQueryResult<LayoutSets> => {
      const { getLayoutSets } = useServicesContext();
      return useQuery<LayoutSets>(
        [QueryKey.LayoutSets, org, app],
        () => getLayoutSets(org, app).then(layoutSets => layoutSets?.sets ? layoutSets : null),
      );
    };
