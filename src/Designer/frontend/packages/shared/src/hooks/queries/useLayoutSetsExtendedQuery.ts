import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import type { LayoutSetModel } from '../../types/api/dto/LayoutSetModel';
import { QueryKey } from '../../types/QueryKey';
import { isBelowSupportedVersion } from '../../utils/compareFunctions';
import { useAppVersionQuery } from './useAppVersionQuery';
import { NEXT_V9_VERSION } from '../../constants';

export const useLayoutSetsExtendedQuery = (
  org: string,
  app: string,
): UseQueryResult<LayoutSetModel[], Error> => {
  const { data: appVersion } = useAppVersionQuery(org, app);
  const { getLayoutSetsExtendedV4, getLayoutSetsExtended } = useServicesContext();

  const useV9Endpoint = !isBelowSupportedVersion(appVersion?.backendVersion, NEXT_V9_VERSION);

  return useQuery<LayoutSetModel[]>({
    queryKey: [
      useV9Endpoint ? QueryKey.LayoutSetsExtended : QueryKey.LayoutSetsExtendedV4,
      org,
      app,
    ],
    queryFn: () =>
      useV9Endpoint ? getLayoutSetsExtended(org, app) : getLayoutSetsExtendedV4(org, app),
    enabled: !!appVersion,
  });
};
