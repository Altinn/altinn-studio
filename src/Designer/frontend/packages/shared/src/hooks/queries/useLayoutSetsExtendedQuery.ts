import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import type { LayoutSetModel } from '../../types/api/dto/LayoutSetModel';
import { QueryKey } from '../../types/QueryKey';
import { isBelowSupportedVersion } from '../../utils/compareFunctions';
import { useAppVersionQuery } from './useAppVersionQuery';

const LAYOUT_SETS_EXTENDED_V9_VERSION = 9;

export const useLayoutSetsExtendedQuery = (
  org: string,
  app: string,
): UseQueryResult<LayoutSetModel[], Error> => {
  const { data: appVersion } = useAppVersionQuery(org, app);
  const { getLayoutSetsExtended, getLayoutSetsExtendedV9 } = useServicesContext();

  const useV9Endpoint = !isBelowSupportedVersion(
    appVersion?.backendVersion,
    LAYOUT_SETS_EXTENDED_V9_VERSION,
  );

  return useQuery<LayoutSetModel[]>({
    queryKey: [
      useV9Endpoint ? QueryKey.LayoutSetsExtendedV9 : QueryKey.LayoutSetsExtended,
      org,
      app,
    ],
    queryFn: () =>
      useV9Endpoint ? getLayoutSetsExtendedV9(org, app) : getLayoutSetsExtended(org, app),
    enabled: !!appVersion,
  });
};
