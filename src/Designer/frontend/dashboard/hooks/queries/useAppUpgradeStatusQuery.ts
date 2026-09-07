import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AppUpgradeStatus } from 'app-shared/types/AppUpgrade';

export const useAppUpgradeStatusQuery = (
  org: string,
  app: string,
): UseQueryResult<AppUpgradeStatus> => {
  const { getAppUpgradeStatus } = useServicesContext();
  return useQuery<AppUpgradeStatus>({
    queryKey: [QueryKey.AppUpgradeStatus, org, app],
    queryFn: () => getAppUpgradeStatus(org, app),
    meta: { hideDefaultError: true },
  });
};
