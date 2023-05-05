import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { ILayoutSets } from '../../types/global';
import { useServicesContext } from '../../../../../app-development/common/ServiceContext';
import { QueryKey } from '../../types/QueryKey';

export const useLayoutSetsQuery =
  (org: string, app: string): UseQueryResult<ILayoutSets> => {
      const { getLayoutSets } = useServicesContext();
      return useQuery<ILayoutSets>(
        [QueryKey.LayoutSets, org, app],
        () => getLayoutSets(org, app).then(layoutSets => {
            return layoutSets?.sets ? layoutSets : undefined;
          }
        ),
      );
    };
